const express = require('express');
const cookieParser = require('cookie-parser');
const { router: auth } = require(__dirname +'/auth.js')
const auctionRouter = require(__dirname +'/route.js');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname+'/public'));
app.use('/api/auth', auth);
app.use('/api', auctionRouter);


app.listen(port, () => {
  
  console.log(`🚀 Server attivo! Ascolto sulla porta ${port}`);

});
