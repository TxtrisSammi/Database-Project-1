const { stringify } = require("querystring"); const express = require("express")
const app = express.Router()

app.get("/playlists/:id", async (req, res) => {
  let id = req.params.id
  let token = req.session.authToken

  if (token && id) {
    try {
      let playlist = await getPlaylistInfo(token, id)
      let tracks = await getTracks(token, id)
      res.render("playlist.ejs", { playlist: playlist, tracks: tracks })
    } catch (error) {
      console.error("Error fetching playlist:", error)
      res.redirect("/user")
    }
  } else {
    res.redirect("/user")
  }

})

async function getPlaylistInfo(accessToken, id) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.status}`)
  }
  const data = await response.json()
  return data
}

async function getTracks(accessToken, id) {
  let tracks = []
  let url = `https://api.spotify.com/v1/playlists/${id}/tracks`
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch tracks: ${response.status}`)
    }
    const data = await response.json()
    tracks = tracks.concat(data.items);
    url = data.next
  }
  return tracks
}

module.exports = app
