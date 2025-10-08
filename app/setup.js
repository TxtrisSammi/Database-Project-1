// imports
require("dotenv").config(); // allow reading from .env
const mysql = require("mysql");

// setup db connection
let con = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASS,
    database: process.env.DB
});

// connect and perform queries
con.connect(function(err) {
    if (err) throw err; // if theres an error connecting, throw error

    // create db if not existing

    // create tables

    // etc
})