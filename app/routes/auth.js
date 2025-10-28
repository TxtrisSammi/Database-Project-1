const { stringify } = require("querystring");
const express = require("express")
const app = express.Router()

// Login with Spotify Account
// this runs when user clicks sign in with spotify and redirects them to the spotify authorization page
app.get("/login", (req, res) => {
  // set scope of what our app can do
  const scope = ["user-read-private", "user-read-email"]
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
  // gets the code from the url, if there is no code available, set it to null
  // TODO: redirect the user back to auth if no token
  const code = req.query.code || null;
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
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", authOptions);

  // read the token as json
  const tokenData = await tokenResponse.json();

  // extract token
  const accessToken = tokenData.access_token;

  // use token to get user data
  // const userData = await getProfile(accessToken);

  // res.send({ user: userData });

  // store token in session
  req.session.authToken = accessToken
  res.redirect("/user")
});

module.exports = app
