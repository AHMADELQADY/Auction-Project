const express = require("express");
const jwt = require("jsonwebtoken");
const db = require( __dirname +"/db.js");
const router = express.Router();
const bcrypt = require('bcryptjs');

function verifyToken(req, res, next) {
  // Assicurati di aver configurato il middleware cookie-parser
  const token = req.cookies?.token; // Usa req.cookies per accedere ai cookie

  if (token) {
    jwt.verify(token, "Il Principe mezzo sangue", (err, payload) => {
      if (err) {
        // In caso di errore nella verifica del token
        return res.status(403).json({ error: "Invalid token. Please login again." });
      } else {
        // Aggiungi i dati del payload all'oggetto req (opzionale)
        req.user = payload;
        next(); // Continua al prossimo middleware
      }
    });
  } else {
    // Token non presente
    return res.status(403).json({ error: "Authentication required. Please login to proceed." });
  }
}



router.post("/signin", async (req,res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const mongo = await db.connect2db();
    //const u = {username , password}; // questo u ha due camoi che ho tirato fuori da req.body
    const user = await mongo.collection("Users").findOne({ username }); 
    // aggiungendo && username === user.username && password === user.password è un difensive programming
    // Controlla se l'utente esiste
    if (!user) {
      return res.status(404).json({ error: "User does not exist. Please register first." });
    }
    // Verifica la password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password. Please try again." });
    }

    // se l'utente è autenticato allora costruisco il token jwt

    const payload = { 
      username: user.username,
      name: user.name,        
      surname: user.surname   
    }; // non ho usato user perchè user ha anche il password
    let token = jwt.sign(payload, "Il Principe mezzo sangue", { expiresIn: "1d" });
    res.cookie('token', token, {httpOnly: true}); // aggiungendo {httpOnly: true} diventa un cookie particolare che sono sicure cookie visibili al browser ma non ha codice js dentro il browser e questo per motivi di sicurezza per non fare attacco al browser e rubo il cookie.

    // il grosso vantaggio di usare jwt è che do il cookie al browserr e lo gestisce lui cosi non usiamo altre robe per salvare il token nello storage del browser nel caso che ho tanta pagine
    //res.redirect('/libri.html'); // Redirige alla risorsa protetta
    res.status(200).json({ success: "Login successful!" });
  } catch (err) {
    res.status(500).json({ error: "Server error. Please try again later.", details: err.message });
  } 


});

router.post("/signup", async (req, res) => {
  try {
    // Connessione al database
    const mongo = await db.connect2db();

    // Recupero dei dati inviati dal client tramite il corpo della richiesta
    const username = req.body.username; // Nome utente inserito nel form
    const password = req.body.password; // Password in chiaro, verrà crittografata
    const name = req.body.name; // Nome dell'utente
    const surname = req.body.surname; // Cognome dell'utente

    // Validazione dei dati: controllo che tutti i campi richiesti siano presenti
    if (!username || !password || !name || !surname) {
      // Se manca un campo, restituisce un errore 400 con un messaggio
      console.log(req.body);
      return res.status(400).json({ error: "All fields are required" });
    }

    // Controllo se l'username è già esistente nel database
    const existingUser = await mongo.collection("Users").findOne({ username });
    if (existingUser) {
      // Se l'utente esiste già, restituisce un errore 400
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash della password: crittografiamo la password per non salvarla in chiaro
    const hashedPassword = await bcrypt.hash(password, 10); // Hash della password con un "salt" di 10 cicli

    // Creazione dell'oggetto utente da salvare nel database
    const user = {
      username, // Nome utente
      password: hashedPassword, // Password crittografata
      name, // Nome dell'utente
      surname // Cognome dell'utente
    };

    // Inserimento dell'utente nella collezione "users"
    const result = await mongo.collection("Users").insertOne(user);

    // Risposta al client con un messaggio di successo e l'ID dell'utente creato
    res.status(201).json({ 
      message: "User registered successfully", 
      userId: result.insertedId 
    });
  } catch (err) {
    // Gestione degli errori: cattura eventuali problemi e restituisce un errore 500
    res.status(500).json({ 
      error: "Database error", 
      details: err.message 
    });
  }
});


router.post('/logout', (req, res) => {
  // Rimuovi il cookie 'token'
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  return res.status(200).json({ message: 'Logout successful' });
});



module.exports = { router, verifyToken };
//module.exports = router;