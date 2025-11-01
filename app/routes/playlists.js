const { stringify } = require("querystring"); const express = require("express")
const app = express.Router()

app.get("/playlists/:id", (req, res) => {
  let id = req.params.id
  let token = req.session.authToken

  if (token && id) {
    let tracks = getTracks(token, id)
    res.send(tracks)
  } else {
    res.redirect("/user")
  }

})

async function getTracks(accessToken, id) {
  let tracks = []
  let url = `https://api.spotify.com/v1/playlists/${id}/tracks`
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })
    const data = await response.json()
    tracks = tracks.concat(data.items);
    url = data.next
  }
  return tracks
}

module.exports = app
