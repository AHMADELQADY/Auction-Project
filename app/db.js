const { MongoClient } = require('mongodb');
const URI = "mongodb://mongo_aste:27017";
let cachedDB;

module.exports = {
  connect2db: async () => {
    if (cachedDB) {
      console.log("Recupero connessione esistente");
      return cachedDB;
    }
    try {
      console.log("Creo nuova connessione");
      const client = await MongoClient.connect(URI); // Removed useUnifiedTopology
      cachedDB = client.db("AuctionDatabase");
      console.log("Connessione a MongoDB stabilita");
      return cachedDB;
    } catch (err) {
      console.error("Errore nella connessione a MongoDB:", err);
      throw new Error("Database connection failed");
    }
  }
};