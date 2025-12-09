const { stringify } = require("querystring");
const express = require("express")
const app = express.Router()

// Login with Spotify Account
// this runs when user clicks sign in with spotify and redirects them to the spotify authorization page
app.get("/login", (req, res) => {
  console.log('[AUTH] /login - Redirecting to Spotify authorization')
  // set scope of what our app can do
  const scopes = ["user-read-private", "user-read-email", "playlist-read-private", "playlist-read-collaborative", "user-library-read", "user-top-read", "user-library-modify", "playlist-modify-public", "playlist-modify-private"]
  // console.log('[AUTH] Scopes requested:', scopes.join(', '))
  // send user to auth page with our app credentials
  res.redirect("https://accounts.spotify.com/authorize?" + stringify({
    response_type: "code",
    client_id: process.env.ID,
    scope: scopes.join(' '),
    redirect_uri: process.env.REDIRECT
  }))
})

// this is where the user is sent after authorizing our app 
// and it requests a token from spotify so that we can use the api in the name of the user
app.get("/callback", async (req, res) => {
  console.log('[AUTH] /callback - Received callback from Spotify')
  // gets the code from the url, if there is no code available, redirect to login
  const code = req.query.code || null

  if (!code) {
    console.log('[AUTH] No authorization code received, redirecting to login')
    return res.redirect("/login")
  }

  // console.log('[AUTH] Authorization code received, requesting access token')
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
    console.error('[AUTH] Failed to get token - Status:', tokenResponse.status)
    return res.redirect("/login")
  }

  // read the token as json
  const tokenData = await tokenResponse.json()

  if (!tokenData || !tokenData.access_token) {
    console.error('[AUTH] Invalid token response - No access token in response')
    return res.redirect("/login")
  }

  // extract tokens
  const accessToken = tokenData.access_token
  const refreshToken = tokenData.refresh_token

  // console.log('[AUTH] Tokens received successfully')
  // console.log('[AUTH] Access token present:', !!accessToken)
  // console.log('[AUTH] Refresh token present:', !!refreshToken)

  // store tokens in session
  req.session.authToken = accessToken
  if (refreshToken) {
    req.session.refreshToken = refreshToken
  }

  // Fetch user ID and store in session
  try {
    console.log('[AUTH] Fetching user ID from Spotify')
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })

    console.log('[AUTH] User fetch response status:', userResponse.status)
    
    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log('[AUTH] User data received:', userData ? 'yes' : 'no', 'Has ID:', !!userData?.id)
      if (userData && userData.id) {
        req.session.userId = userData.id
        console.log('[AUTH] User ID stored in session:', userData.id)
      } else {
        console.error('[AUTH] No user ID in response data')
      }
    } else {
      console.error('[AUTH] Failed to fetch user - Status:', userResponse.status)
      const errorText = await userResponse.text()
      console.error('[AUTH] Error response:', errorText)
    }
  } catch (error) {
    console.error('[AUTH] Exception fetching user ID:', error.message)
  }

  // console.log('[AUTH] Tokens stored in session, redirecting to /user')
  req.session.save((err) => {
    if (err) {
      console.error('[AUTH] Failed to save session:', err.message)
      return res.redirect("/login")
    }
    res.redirect("/user")
  })
});

app.get("/auth", (req, res) => {
  console.log('[AUTH] /auth - Redirecting to /login')
  res.redirect("/login")
})

module.exports = app
