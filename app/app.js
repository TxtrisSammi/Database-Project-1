// imports
require("dotenv").config(); // allow reading from .env
const express = require('express');
const path = require('path');
const session = require("express-session")
const router = require('./router')

// create app
const app = express();
const port = 8080;

// app setup
app.set('view engine', 'ejs'); // set view engine
app.set('views', path.join(__dirname, 'views')); // pass views
app.use(express.static(path.join(__dirname, 'public'))); // pass public

// session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

// import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

// landing page
app.get('/', (req, res) => {
  res.render("index.ejs")
})


// routing stuff 
app.use('/', router);


// import routes
app.use("/", authRoutes)
app.use("/", userRoutes)

// listen for connections
app.listen(port, function () {
  console.log("App running on port: " + port);
})

