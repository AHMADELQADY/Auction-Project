const express = require("express");
const db = require(__dirname + "/db.js");
const { verifyToken } = require("./auth.js");
const router = express.Router();
const { ObjectId } = require("mongodb"); // Importa ObjectId correttamente


// Recupera un elenco di utenti con filtro opzionale
router.get("/users", verifyToken, async (req, res) => {
  try {
    const query = req.query.q; // Ottieni il parametro `q` dalla query string
    const mongo = await db.connect2db();
    const filter = query
      ? {
          $or: [
            { username: { $regex: query, $options: "i" } }, // Cerca per username
            { name: { $regex: query, $options: "i" } },     // Cerca per nome
            { surname: { $regex: query, $options: "i" } }   // Cerca per cognome
          ]
        }
      : {}; // Nessun filtro se `q` non è presente

    // Recupera solo i campi `name`, `surname` e `username`
    const users = await mongo
      .collection("Users")
      .find(filter)
      .project({ name: 1, surname: 1, username: 1, _id: 0 }) // Include i campi richiesti e esclude `_id`
      .toArray();

    res.status(200).json(users); // Restituisci l'elenco degli utenti
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users", details: err.message });
  }
});

// Recupera un utente specifico
router.get("/users/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id; // Ottieni l'ID dall'URL

    // Verifica se l'ID è valido
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    const mongo = await db.connect2db();

    // Trova l'utente con l'ID specificato, escludendo il campo `password`
    const user = await mongo
      .collection("Users")
      .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(user); // Restituisce i dettagli dell'utente
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ error: "Failed to fetch user details", details: err.message });
  }
});

// Recupera un elenco di aste con filtro opzionale
router.get("/auctions", async (req, res) => {
  try {
    const query = req.query.q; // Ottieni il parametro `q` dalla query string
    const mongo = await db.connect2db();

    // Crea il filtro per la query
    const filter = query
      ? {
          $or: [
            { title: { $regex: query, $options: "i" } },        // Cerca nel titolo
            { description: { $regex: query, $options: "i" } }  // Cerca nella descrizione
          ]
        }
      : {}; // Nessun filtro se `q` non è presente

    // Recupera le aste dal database
    const auctions = await mongo.collection("Auctions").find(filter).toArray();

    const now = new Date();

    // Aggiorna dinamicamente i campi "winner" e "highestBidder"
    const updatedAuctions = await Promise.all(
      auctions.map(async (auction) => {
        const isExpired = new Date(auction.expirationDate) <= now;

        if (isExpired) {
          // Controlla se ci sono offerte per questa asta
          const highestBid = await mongo.collection("Bids").findOne(
            { auctionId: auction._id },
            { sort: { amount: -1 } } // Ordina per importo decrescente
          );

          return {
            ...auction,
            winner: highestBid
              ? highestBid.username // Mostra il nome del vincitore
              : "No winner, no bids were placed.", // Messaggio per aste senza offerte
          };
        } else {
          // Mostra il miglior offerente se l'asta è ancora attiva
          const highestBid = await mongo.collection("Bids").findOne(
            { auctionId: auction._id },
            { sort: { amount: -1 } } // Ordina per importo decrescente
          );

          return {
            ...auction,
            highestBidder: highestBid ? highestBid.username : "No Bidders Yet",
            winner: "Auction is not over", // Imposta "Auction is not over" per aste attive
          };
        }
      })
    );

    res.status(200).json(updatedAuctions); // Restituisce l'elenco delle aste con i dettagli aggiornati
  } catch (err) {
    console.error("Error fetching auctions:", err);
    res.status(500).json({ error: "Failed to fetch auctions", details: err.message });
  }
});

// Creazione di un'asta
router.post("/auctions", verifyToken, async (req, res) => {
  try {
    const { title, description, expirationDate, startingPrice } = req.body;

    // Validazione dei campi obbligatori
    if (!title || !description || !expirationDate || !startingPrice) {
      return res.status(400).json({ error: "All fields are required: title, description, expirationDate, startingPrice." });
    }

    // Validazione di expirationDate
    const expiration = new Date(expirationDate);
    if (isNaN(expiration) || expiration <= new Date()) {
      return res.status(400).json({ error: "Expiration date must be a valid future date." });
    }

    // Validazione di startingPrice
    if (isNaN(startingPrice) || startingPrice <= 0) {
      return res.status(400).json({ error: "Starting price must be a positive number." });
    }

    const mongo = await db.connect2db();
    const auction = {
      title,
      description,
      expirationDate: expiration.toLocaleString(),
      startingPrice: parseFloat(startingPrice),
      createdBy: req.user.username, // Username dell'utente autenticato
      createdAt: new Date(),
    };

    const result = await mongo.collection("Auctions").insertOne(auction);

    res.status(201).json({
      success: "Auction created successfully",
      auctionId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create auction", details: err.message });
  }
});


// Recupera i dettagli di un'asta specifica
router.get("/auctions/:id", verifyToken, async (req, res) => {
  try {
    const auctionId = req.params.id;

    // Verifica che l'ID sia valido
    if (!ObjectId.isValid(auctionId)) {
      return res.status(400).json({ error: "Invalid auction ID format." });
    }

    const mongo = await db.connect2db();

    // Recupera l'asta dal database
    const auction = await mongo
      .collection("Auctions")
      .findOne({ _id: new ObjectId(auctionId) });

    if (!auction) {
      return res.status(404).json({ error: "Auction not found." });
    }

    const now = new Date();
    const isExpired = new Date(auction.expirationDate) <= now;

    console.log("Expiration date from DB:", auction.expirationDate);
    console.log("Current date:", now.toISOString());
    console.log("Is expired:", isExpired);

    let highestBid = null;
    let highestBidder = null;

    // Recupera l'offerta più alta per questa asta
    highestBid = await mongo.collection("Bids").findOne(
      { auctionId: auction._id },
      { sort: { amount: -1 } } // Ordina per importo decrescente
    );

    highestBidder = highestBid ? highestBid.username : null;

    // Aggiorna il vincitore nel database se l'asta è scaduta
    if (isExpired && !auction.winner) {
      const winner = highestBidder || "No winner, no bids were placed.";
      console.log("Updating winner:", winner);

      await mongo.collection("Auctions").updateOne(
        { _id: auction._id },
        { $set: { winner: winner } }
      );

      auction.winner = winner; // Aggiorna anche localmente
    }

    // Costruisce la risposta
    const response = {
      _id: auction._id.toString(),
      title: auction.title,
      description: auction.description,
      expirationDate: auction.expirationDate,
      startingPrice: auction.startingPrice,
      currentBid: highestBid ? highestBid.amount : auction.startingPrice, // Mostra l'offerta corrente o il prezzo di partenza
      highestBidder: highestBidder || "No bidders yet", // Mostra il miglior offerente
      winner: isExpired
        ? auction.winner || "No winner, no bids were placed."
        : "Auction is not over", // Mostra il vincitore solo se l'asta è scaduta
      createdBy: auction.createdBy,
      createdAt: auction.createdAt,
    };

    console.log("Response:", response);

    res.status(200).json(response); // Restituisce i dettagli completi
  } catch (err) {
    console.error("Error fetching auction details:", err);
    res.status(500).json({ error: "Failed to fetch auction details", details: err.message });
  }
});

// Modifica solo titolo e descrizione di un'asta esistente
router.put("/auctions/:id", verifyToken, async (req, res) => {
  try {
    const auctionId = req.params.id; // Ottieni l'ID dell'asta dall'URL
    const { title, description } = req.body; // Ottieni titolo e descrizione dal corpo della richiesta

    // Verifica che l'ID sia valido
    if (!ObjectId.isValid(auctionId)) {
      return res.status(400).json({ error: "Invalid auction ID format." });
    }

    // Verifica che almeno uno dei campi sia presente
    if (!title && !description) {
      return res.status(400).json({ error: "Title or description must be provided." });
    }

    const mongo = await db.connect2db();

    // Trova l'asta nel database
    const auction = await mongo.collection("Auctions").findOne({ _id: new ObjectId(auctionId) });

    if (!auction) {
      return res.status(404).json({ error: "Auction not found." });
    }

    // Verifica che l'utente autenticato sia il creatore dell'asta
    if (auction.createdBy !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to modify this auction." });
    }

    // Aggiorna solo i campi titolo e descrizione
    const updatedFields = {};
    if (title) updatedFields.title = title;
    if (description) updatedFields.description = description;

    // Esegui l'aggiornamento
    const result = await mongo
      .collection("Auctions")
      .updateOne({ _id: new ObjectId(auctionId) }, { $set: updatedFields });

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: "Failed to update the auction." });
    }

    res.status(200).json({ success: "Auction updated successfully." });
  } catch (err) {
    console.error("Error updating auction:", err);
    res.status(500).json({ error: "Failed to update auction", details: err.message });
  }
});


// Elimina un'asta esistente
router.delete("/auctions/:id", verifyToken, async (req, res) => {
  try {
    const auctionId = req.params.id; // Ottieni l'ID dell'asta dall'URL

    // Verifica che l'ID sia valido
    if (!ObjectId.isValid(auctionId)) {
      return res.status(400).json({ error: "Invalid auction ID format." });
    }

    const mongo = await db.connect2db();

    // Trova l'asta da eliminare
    const auction = await mongo.collection("Auctions").findOne({ _id: new ObjectId(auctionId) });

    if (!auction) {
      return res.status(404).json({ error: "Auction not found." });
    }

    // Verifica che l'utente autenticato sia il creatore dell'asta
    if (auction.createdBy !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to delete this auction." });
    }

    // Elimina l'asta
    const result = await mongo.collection("Auctions").deleteOne({ _id: new ObjectId(auctionId) });

    if (result.deletedCount === 0) {
      return res.status(500).json({ error: "Failed to delete the auction." });
    }

    res.status(200).json({ success: "Auction deleted successfully." });
  } catch (err) {
    console.error("Error deleting auction:", err);
    res.status(500).json({ error: "Failed to delete auction", details: err.message });
  }
});

// Recupera lo storico delle offerte per un'asta specifica
router.get("/auctions/:id/bids", verifyToken, async (req, res) => {
  try {
    const auctionId = req.params.id; // Ottieni l'ID dell'asta dall'URL

    // Verifica che l'ID sia valido
    if (!ObjectId.isValid(auctionId)) {
      return res.status(400).json({ error: "Invalid auction ID format." });
    }

    const mongo = await db.connect2db();

    // Verifica se l'asta esiste
    const auction = await mongo.collection("Auctions").findOne({ _id: new ObjectId(auctionId) });

    if (!auction) {
      return res.status(404).json({ error: "Auction not found." });
    }

    // Recupera tutte le offerte associate all'asta
    const bids = await mongo
      .collection("Bids") // Supponendo che le offerte siano salvate nella collezione "Bids"
      .find({ auctionId: new ObjectId(auctionId) })
      .sort({ createdAt: -1 }) // Ordina per data di creazione in ordine decrescente
      .toArray();

    // Costruisci la risposta con i dettagli dell'asta e lo storico delle offerte
    const response = {
      auctionDetails: {
        title: auction.title,
        description: auction.description,
        startingPrice: auction.startingPrice,
        currentBid: auction.currentBid || auction.startingPrice,
        winner: auction.winner || "No bids yet",
        expirationDate: auction.expirationDate,
        createdBy: auction.createdBy,
        createdAt: auction.createdAt,
      },
      bidHistory: bids, // Storico delle offerte
    };

    res.status(200).json(response); // Restituisce i dettagli e lo storico delle offerte
  } catch (err) {
    console.error("Error fetching auction bids:", err);
    res.status(500).json({ error: "Failed to fetch bids", details: err.message });
  }
});

// Nuova offerta per un'asta specifica
router.post("/auctions/:id/bids", verifyToken, async (req, res) => {
  try {
    const auctionId = req.params.id; // Ottieni l'ID dell'asta dall'URL
    const { amount } = req.body; // Importo dell'offerta fornito dall'utente

    // Verifica che l'ID sia valido
    if (!ObjectId.isValid(auctionId)) {
      return res.status(400).json({ error: "Invalid auction ID format." });
    }

    // Verifica che l'importo sia valido
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid bid amount. It must be a positive number." });
    }

    const mongo = await db.connect2db();

    // Trova l'asta corrispondente
    const auction = await mongo.collection("Auctions").findOne({ _id: new ObjectId(auctionId) });

    if (!auction) {
      return res.status(404).json({ error: "Auction not found." });
    }

    // Controlla se l'asta è scaduta
    const now = new Date();
    if (new Date(auction.expirationDate) <= now) {
      return res.status(400).json({ error: "This auction has already expired." });
    }

    // Controlla se l'importo dell'offerta è maggiore dell'offerta corrente
    const currentBid = auction.currentBid || auction.startingPrice;
    if (amount <= currentBid) {
      return res.status(400).json({ error: `Your bid must be greater than the current bid of ${currentBid}.` });
    }

    // Inserisci la nuova offerta nella collezione "Bids"
    const bid = {
      auctionId: new ObjectId(auctionId),
      username: req.user.username, // Nome utente dall'oggetto autenticato
      name: req.user.name,
      surname: req.user.surname,
      amount: parseFloat(amount), // Assicurati che l'importo sia un numero
      createdAt: now,
    };

    await mongo.collection("Bids").insertOne(bid);
      console.log(req.user.name, req.user.surname);
    // Aggiorna l'offerta corrente e il vincitore nell'asta
    await mongo.collection("Auctions").updateOne(
      { _id: new ObjectId(auctionId) },
      { $set: { currentBid: bid.amount, winner: bid.username } }
    );

    res.status(201).json(/*{ success: "Bid placed successfully.",*/ bid/* }*/);
  } catch (err) {
    console.error("Error placing bid:", err);
    res.status(500).json({ error: "Failed to place bid", details: err.message });
  }
});


// Recupera i dettagli di un'offerta specifica
router.get("/bids/:id", verifyToken, async (req, res) => {
  try {
    const bidId = req.params.id; // Ottieni l'ID dell'offerta dall'URL

   /*  // Verifica che l'utente sia autorizzato
    if (req.user.username !== "admin") {
      return res.status(403).json({ error: "You are not authorized to view these details." });
    } */

    // Verifica che l'ID sia valido
    if (!ObjectId.isValid(bidId)) {
      return res.status(400).json({ error: "Invalid bid ID format." });
    }

    const mongo = await db.connect2db();

    // Trova l'offerta nel database
    const bid = await mongo.collection("Bids").findOne({ _id: new ObjectId(bidId) });

    // Controlla se l'offerta esiste
    if (!bid) {
      return res.status(404).json({ error: "Bid not found." });
    }

    res.status(200).json(bid); // Restituisce i dettagli dell'offerta
  } catch (err) {
    console.error("Error fetching bid details:", err);
    res.status(500).json({ error: "Failed to fetch bid details", details: err.message });
  }
});

// Restituisce le informazioni sull'utente autenticato
router.get("/whoami", verifyToken, async (req, res) => {
  try {
    const mongo = await db.connect2db();

    // Trova l'utente autenticato nel database
    const user = await mongo.collection("Users").findOne({ username: req.user.username });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Restituisce solo le informazioni pubbliche dell'utente
    const response = {
      name: user.name,
      surname: user.surname,
      username: user.username,
      createdAt: user.createdAt,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ error: "Failed to fetch user details", details: err.message });
  }
});

module.exports = router;