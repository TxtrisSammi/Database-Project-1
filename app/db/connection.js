require("dotenv").config()
const mysql = require("mysql")

function newConnection() {
  let con = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASS,
    database: process.env.DB,
    multipleStatements: true
  });
  return con
}

module.exports = newConnection
