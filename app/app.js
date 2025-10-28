// imports
require("dotenv").config(); // allow reading from .env
const express = require('express');
const mysql = require('mysql');
const path = require('path');
const router = require('./router')

// create app
const app = express();
const port = 8080;

// app setup
app.set('view engine', 'ejs'); // set view engine
app.set('views', path.join(__dirname, 'views')); // pass views
app.use(express.static(path.join(__dirname, 'public'))); // pass public


// app stuff goes here
app.get('/', (req,res) => {
    res.render("index.ejs")
})


// routing stuff 
app.use('/', router);


app.listen(port, function() {
    console.log("App running on port: " + port);
})
