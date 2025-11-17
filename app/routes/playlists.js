const express = require("express")
const app = express.Router()
const { ensureValidToken } = require("../utils/tokenRefresh")
const { validatePlaylistId } = require("../middleware/validateInput")
const { addTracks } = require("../db/add-tracks")
// const { addGenre } = require("../db/add-genre")

app.get("/playlists/:id", validatePlaylistId, async (req, res, next) => {
  let id = req.params.id

  try {
    let token = await ensureValidToken(req)

    if (!token) {
      return res.redirect("/auth")
    }

    let playlist = await getPlaylistInfo(token, id)
    let tracks = await getTracks(token, id)


    addTracks(tracks, id, token)

    res.render("playlist.ejs", { playlist: playlist, tracks: tracks })

  } catch (error) {
    next(error)
  }
})

async function getPlaylistInfo(accessToken, id) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Token expired or invalid: ${response.status}`)
    }
    throw new Error(`Failed to fetch playlist: ${response.status}`)
  }

  const data = await response.json()

  if (!data || !data.id) {
    throw new Error("Invalid playlist data received")
  }

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
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch tracks: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data.items)) {
      throw new Error("Invalid tracks data received")
    }

    tracks = tracks.concat(data.items)
    url = data.next
  }

  return tracks
}



module.exports = app