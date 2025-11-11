const { stringify } = require("querystring");
const express = require("express")
const app = express.Router()

// Login with Spotify Account
// this runs when user clicks sign in with spotify and redirects them to the spotify authorization page
app.get("/login", (req, res) => {
  // set scope of what our app can do
  const scope = ["user-read-private", "user-read-email", "playlist-read-private", "playlist-read-collaborative"]
  // send user to auth page with our app credentials
  res.redirect("https://accounts.spotify.com/authorize?" + stringify({
    response_type: "code",
    client_id: process.env.ID,
    scope: scope,
    redirect_uri: process.env.REDIRECT
  }))
})

// this is where the user is sent after authorizing our app 
// and it requests a token from spotify so that we can use the api in the name of the user
app.get("/callback", async (req, res) => {
  // gets the code from the url, if there is no code available, redirect to login
  const code = req.query.code || null
  
  if (!code) {
    return res.redirect("/login")
  }
  // this builds the token request
  const authOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(process.env.ID + ":" + process.env.SECRET).toString("base64")
    },
    body: new URLSearchParams({
      code: code,
      redirect_uri: process.env.REDIRECT,
      grant_type: "authorization_code"
    })
  };

  // send the request and wait for it to return
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", authOptions)

  if (!tokenResponse.ok) {
    console.error("Failed to get token:", tokenResponse.status)
    return res.redirect("/login")
  }

  // read the token as json
  const tokenData = await tokenResponse.json()

  if (!tokenData || !tokenData.access_token) {
    console.error("Invalid token response")
    return res.redirect("/login")
  }

  // extract tokens
  const accessToken = tokenData.access_token
  const refreshToken = tokenData.refresh_token

  // store tokens in session
  req.session.authToken = accessToken
  if (refreshToken) {
    req.session.refreshToken = refreshToken
  }
  res.redirect("/user")
});

app.get("/auth", (req, res) => {
  res.redirect("/login")
})

module.exports = app
