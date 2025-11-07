const { stringify } = require("querystring"); const express = require("express")
const app = express.Router()

app.get("/user", async (req, res) => {

  let token = req.session.authToken

  if (token) {
    let user = await getProfile(token)
    let playlists = await getPlaylists(token)

    res.render("user.ejs", { user: user, playlists: playlists })
    // res.send(data)
  } else {
    res.redirect("/auth")
  }

})

async function getProfile(accessToken) {
  // send user data request with token
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })

  // wait for it to come in and return it from the function
  const data = await response.json()
  return data
}

async function getPlaylists(accessToken) {
  let playlists = []
  let url = "https://api.spotify.com/v1/me/playlists"
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })
    const data = await response.json()
    playlists = playlists.concat(data.items);
    url = data.next
  }
  return playlists
}

module.exports = app
