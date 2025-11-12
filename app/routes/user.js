const express = require("express")
const app = express.Router()
const { ensureValidToken } = require("../utils/tokenRefresh")
const { addUser } = require("../db/add-user")
const { addPlaylists } = require("../db/add-playlists")


app.get("/user", async (req, res, next) => {
  try {
    let token = await ensureValidToken(req)

    if (!token) {
      return res.redirect("/auth")
    }

    let user = await getProfile(token)
    let playlists = await getPlaylists(token)

    addUser(user.id, user.display_name)
    addPlaylists(playlists, user.id)

    res.render("user.ejs", { user: user, playlists: playlists })
  } catch (error) {
    next(error)
  }
})

async function getProfile(accessToken) {
  // send user data request with token
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Token expired or invalid: ${response.status}`)
    }
    throw new Error(`Failed to fetch user profile: ${response.status}`)
  }

  // wait for it to come in and return it from the function
  const data = await response.json()

  if (!data || !data.id) {
    throw new Error("Invalid user data received")
  }

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

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch playlists: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data.items)) {
      throw new Error("Invalid playlists data received")
    }

    playlists = playlists.concat(data.items)
    url = data.next
  }

  return playlists
}

module.exports = app
