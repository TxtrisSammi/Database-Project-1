const express = require("express")
const app = express.Router()
const { ensureValidToken } = require("../utils/tokenRefresh")
const { addUser } = require("../db/add-user")
const { addPlaylists } = require("../db/add-playlists")
const { getUser } = require("../db/get-user")
const { getPlaylists } = require("../db/get-playlists")
const { getTopGenre, getTopArtist, getGenreStats } = require("../db/get-stats")


app.get("/user", async (req, res, next) => {
  console.log('[USER] /user - Loading user profile from database')
  try {
    if (!req.session.userId) {
      console.log('[USER] No userId in session, redirecting to /auth')
      return res.redirect("/auth")
    }

    // Load from database
    let user = await getUser(req.session.userId)
    let playlists = await getPlaylists(req.session.userId)
    let top_genre = await getTopGenre()
    let genre_stats = await getGenreStats()
    let top_artist = await getTopArtist()



    // Convert DB format to expected format
    if (user) {
      user = {
        id: user.UserId,
        display_name: user.Username,
        images: user.ImageURL ? [{ url: user.ImageURL }] : [],
        product: user.Product || 'free'
      }
    } else {
      // No user data in DB, set to null to trigger empty state
      user = null
    }

    if (playlists && playlists.length > 0) {
      playlists = playlists.map(p => ({
        id: p.PlaylistId,
        name: p.PlaylistName,
        description: p.PlaylistDescription,
        images: p.ImageURL ? [{ url: p.ImageURL }] : []
      }))
    } else {
      playlists = []
    }

    if (top_genre) {
      top_genre = {
        genre: top_genre.SingleGenre,
        count: top_genre.GenreCount
      }
    } else {
      top_genre = null;
    }

    if (top_artist) {
      top_artist = {
        artist: top_artist.ArtistName,
        count: top_artist.ArtistCount
      }
    } else {
      top_artist = null;
    }

    console.log('[USER] Rendering user page with DB data')
    console.log('[USER] User:', user ? user.display_name : 'No data')
    console.log('[USER] Playlists:', playlists.length)
    res.render("user.ejs", { user: user, playlists: playlists, top_genre: top_genre, genre_stats: genre_stats, top_artist: top_artist })
  } catch (error) {
    console.error('[USER] Error in /user route:', error.message)
    next(error)
  }
})

app.post("/user/refresh", async (req, res, next) => {
  console.log('[USER] /user/refresh - Fetching fresh data from Spotify')
  try {
    let token = await ensureValidToken(req)

    if (!token) {
      console.log('[USER] No valid token, redirecting to /auth')
      return res.redirect("/auth")
    }

    // First, process pending playlist deletions
    console.log('[USER] Checking for pending playlist deletions...')
    await processPendingPlaylistDeletions(token)

    // console.log('[USER] Fetching user profile from Spotify API')
    let user = await getProfile(token)
    // console.log('[USER] User profile received:', user.display_name, '(ID:', user.id + ')')

    // console.log('[USER] Fetching user playlists from Spotify API')
    let playlists = await getPlaylists_Spotify(token, user.id)
    // console.log('[USER] Received', playlists.length, 'playlists')

    // console.log('[USER] Updating user in database')
    await addUser(user)

    // console.log('[USER] Updating playlists in database')
    addPlaylists(playlists, user.id)

    req.session.userId = user.id

    console.log('[USER] Redirecting back to /user')
    res.redirect('/user')
  } catch (error) {
    console.error('[USER] Error in /user/refresh route:', error.message)
    next(error)
  }
})

async function getProfile(accessToken) {
  // console.log('[API] Calling Spotify API: GET /v1/me')
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

  // console.log('[API] User profile fetched successfully')
  return data
}

async function getPlaylists_Spotify(accessToken, userId) {
  // console.log('[API] Calling Spotify API: GET /v1/me/playlists')
  let playlists = []
  let url = "https://api.spotify.com/v1/me/playlists?limit=50"
  let page = 1

  while (url) {
    // console.log('[API] Fetching playlists page', page)
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

    // console.log('[API] Received', data.items.length, 'playlists on page', page)
    playlists = playlists.concat(data.items)
    url = data.next
    page++
  }

  // Filter to only user-owned playlists
  const ownedPlaylists = playlists.filter(p => p.owner && p.owner.id === userId)
  console.log('[API] Total playlists fetched:', playlists.length, '- User owned:', ownedPlaylists.length)
  return ownedPlaylists
}

async function processPendingPlaylistDeletions(token) {
  const newConnection = require('../db/connection')
  const con = newConnection()

  return new Promise((resolve, reject) => {
    // Get pending playlist deletions
    const query = "SELECT * FROM PendingChanges WHERE ChangeType = 'DELETE_PLAYLIST'"

    con.query(query, async (err, results) => {
      if (err) {
        con.end()
        console.error('[USER] Error fetching pending playlist deletions:', err.message)
        reject(err)
        return
      }

      if (results.length === 0) {
        con.end()
        console.log('[USER] No pending playlist deletions found')
        resolve()
        return
      }

      console.log('[USER] Found', results.length, 'pending playlist deletions')

      // Process each deletion
      for (const change of results) {
        try {
          console.log('[USER] Deleting playlist', change.PlaylistId, 'from Spotify')

          // Make Spotify API call to unfollow (delete) playlist
          const response = await fetch(`https://api.spotify.com/v1/playlists/${change.PlaylistId}/followers`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + token
            }
          })

          if (response.ok || response.status === 404) {
            // 404 means already deleted, which is fine
            console.log('[USER] Successfully deleted playlist from Spotify')

            // Delete the pending change record
            await new Promise((resolve2, reject2) => {
              con.query('DELETE FROM PendingChanges WHERE ChangeId = ?', [change.ChangeId], (err2) => {
                if (err2) reject2(err2)
                else resolve2()
              })
            })
          } else {
            console.error('[USER] Failed to delete playlist from Spotify:', response.status)
          }
        } catch (error) {
          console.error('[USER] Error processing pending playlist deletion:', error.message)
        }
      }

      con.end()
      console.log('[USER] Finished processing pending playlist deletions')
      resolve()
    })
  })
}

module.exports = app
