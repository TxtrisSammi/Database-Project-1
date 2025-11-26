const express = require("express")
const app = express.Router()
const { ensureValidToken } = require("../utils/tokenRefresh")
const { addUser } = require("../db/add-user")
const { addPlaylists } = require("../db/add-playlists")


app.get("/user", async (req, res, next) => {
  console.log('[USER] /user - Fetching user profile and playlists')
  try {
    let token = await ensureValidToken(req)

    if (!token) {
      console.log('[USER] No valid token, redirecting to /auth')
      return res.redirect("/auth")
    }

    console.log('[USER] Fetching user profile from Spotify API')
    let user = await getProfile(token)
    console.log('[USER] User profile received:', user.display_name, '(ID:', user.id + ')')
    
    console.log('[USER] Fetching user playlists from Spotify API')
    let playlists = await getPlaylists(token, user.id)
    console.log('[USER] Received', playlists.length, 'playlists')

    console.log('[USER] Adding user to database')
    addUser(user.id, user.display_name)
    
    console.log('[USER] Adding playlists to database')
    addPlaylists(playlists, user.id)

    console.log('[USER] Rendering user page')
    res.render("user.ejs", { user: user, playlists: playlists })
  } catch (error) {
    console.error('[USER] Error in /user route:', error.message)
    next(error)
  }
})

async function getProfile(accessToken) {
  console.log('[API] Calling Spotify API: GET /v1/me')
  // send user data request with token
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })

  if (!response.ok) {
    console.error('[API] Failed to fetch user profile - Status:', response.status)
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Token expired or invalid: ${response.status}`)
    }
    throw new Error(`Failed to fetch user profile: ${response.status}`)
  }

  // wait for it to come in and return it from the function
  const data = await response.json()

  if (!data || !data.id) {
    console.error('[API] Invalid user data received')
    throw new Error("Invalid user data received")
  }

  console.log('[API] User profile fetched successfully')
  return data
}

async function getPlaylists(accessToken, userId) {
  console.log('[API] Calling Spotify API: GET /v1/me/playlists')
  let playlists = []
  let url = "https://api.spotify.com/v1/me/playlists?limit=50"
  let page = 1

  while (url) {
    console.log('[API] Fetching playlists page', page)
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })

    if (!response.ok) {
      console.error('[API] Failed to fetch playlists - Status:', response.status)
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch playlists: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data.items)) {
      console.error('[API] Invalid playlists data received')
      throw new Error("Invalid playlists data received")
    }

    console.log('[API] Received', data.items.length, 'playlists on page', page)
    playlists = playlists.concat(data.items)
    url = data.next
    page++
  }

  // Filter to only user-owned playlists
  const ownedPlaylists = playlists.filter(p => p.owner && p.owner.id === userId)
  console.log('[API] Total playlists fetched:', playlists.length, '- User owned:', ownedPlaylists.length)
  return ownedPlaylists
}

module.exports = app
