// imports
require("dotenv").config(); // allow reading from .env
const express = require('express');
const path = require('path');
const session = require("express-session")

// create app
const app = express();
const port = 8080;

// app setup
app.set('view engine', 'ejs'); // set view engine
app.set('views', path.join(__dirname, 'views')); // pass views
app.use(express.static(path.join(__dirname, 'public'))); // pass public
app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse URL-encoded bodies

// session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using https
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}))

// log all requests
app.use((req, res, next) => {
  console.log(`\n[REQUEST] ${req.method} ${req.path}`)
  console.log(`[SESSION] Has token: ${!!req.session?.authToken}, Has refresh: ${!!req.session?.refreshToken}, User ID: ${req.session?.userId || 'none'}`)
  next()
})

// import routes
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")
const playRoutes = require("./routes/playlists")
const likedSongsRoutes = require("./routes/liked-songs")
const apiRoutes = require("./routes/api")
const errorHandler = require("./middleware/errorHandler")

// landing page
app.get('/', (req, res) => {
  console.log('[ROUTE] GET / - Landing page accessed')
  res.render("index.ejs")
})

// import routes
app.use("/", authRoutes)
app.use("/", userRoutes)
app.use("/", playRoutes)
app.use("/", likedSongsRoutes)
app.use("/", apiRoutes)

// error handling middleware (must be last)
app.use(errorHandler)

// listen for connections
app.listen(port, function () {
  console.log("App running on port: " + port);
})

