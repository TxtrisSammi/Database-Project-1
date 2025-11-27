const express = require("express")
const app = express.Router()
const { ensureValidToken } = require("../utils/tokenRefresh")
const { validatePlaylistId } = require("../middleware/validateInput")
const { addTracks } = require("../db/add-tracks")
const { getPlaylistTracks, getTrackGenres } = require("../db/get-tracks")
const { getPlaylists } = require("../db/get-playlists")


app.get("/playlists/:id", validatePlaylistId, async (req, res, next) => {
  let id = req.params.id
  console.log('[PLAYLIST] /playlists/' + id + ' - Loading playlist from database')

  try {
    // Load playlist info from database
    const { getPlaylists } = require("../db/get-playlists")
    const playlists = await getPlaylists(req.session.userId || '')
    const playlistData = playlists.find(p => p.PlaylistId === id)

    let playlist = null
    if (playlistData) {
      playlist = {
        id: playlistData.PlaylistId,
        name: playlistData.PlaylistName,
        description: playlistData.PlaylistDescription,
        images: playlistData.ImageURL ? [{ url: playlistData.ImageURL }] : [],
        owner: { display_name: 'You' }
      }
    }

    // Load tracks from database
    let dbTracks = await getPlaylistTracks(id)
    let tracks = []
    let genres = {}

    if (dbTracks && dbTracks.length > 0) {
      // Convert DB format to expected format
      tracks = dbTracks.map(t => ({
        track: {
          id: t.TrackId,
          name: t.TrackName,
          album: {
            name: t.Album,
            images: t.AlbumImageURL ? [{ url: t.AlbumImageURL }] : []
          },
          artists: t.Artists ? t.Artists.split(', ').map((name, idx) => ({
            name: name,
            id: t.ArtistIds ? t.ArtistIds.split(',')[idx] : ''
          })) : [],
          duration_ms: t.DurationMs || 0
        }
      }))

      // Get genres
      const trackIds = dbTracks.map(t => t.TrackId)
      genres = await getTrackGenres(trackIds)
    }

    console.log('[PLAYLIST] Rendering playlist page with DB data')
    console.log('[PLAYLIST] Playlist:', playlist ? playlist.name : 'No data')
    console.log('[PLAYLIST] Tracks:', tracks.length)
    res.render("playlist.ejs", { playlist: playlist, tracks: tracks, genres: genres })

  } catch (error) {
    console.error('[PLAYLIST] Error in /playlists/:id route:', error.message)
    next(error)
  }
})

app.post("/playlists/:id/refresh", validatePlaylistId, async (req, res, next) => {
  let id = req.params.id
  console.log('[PLAYLIST] /playlists/' + id + '/refresh - Fetching from Spotify')

  try {
    let token = await ensureValidToken(req)

    if (!token) {
      console.log('[PLAYLIST] No valid token, redirecting to /auth')
      return res.redirect("/auth")
    }

    // First, process pending changes
    console.log('[PLAYLIST] Checking for pending changes...')
    await processPendingChanges(id, token)

    // console.log('[PLAYLIST] Fetching playlist info for ID:', id)
    let playlist = await getPlaylistInfo(token, id)
    // console.log('[PLAYLIST] Playlist received:', playlist.name)

    // console.log('[PLAYLIST] Fetching tracks for playlist:', id)
    let tracks = await getTracks(token, id)
    // console.log('[PLAYLIST] Received', tracks.length, 'tracks')

    // console.log('[PLAYLIST] Fetching genres for tracks from Spotify')
    let genres = await fetchGenresForTracks(tracks, token)
    // console.log('[PLAYLIST] Genres fetched for', Object.keys(genres).length, 'tracks')

    // console.log('[PLAYLIST] Updating tracks in database')
    await addTracks(tracks, id, token)

    console.log('[PLAYLIST] Redirecting back to playlist')
    res.redirect('/playlists/' + id)

  } catch (error) {
    console.error('[PLAYLIST] Error in /playlists/:id/refresh route:', error.message)
    next(error)
  }
})

async function getPlaylistInfo(accessToken, id) {
  // console.log('[API] Calling Spotify API: GET /v1/playlists/' + id)
  const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })

  if (!response.ok) {
    console.error('[API] Failed to fetch playlist - Status:', response.status)
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Token expired or invalid: ${response.status}`)
    }
    throw new Error(`Failed to fetch playlist: ${response.status}`)
  }

  const data = await response.json()

  if (!data || !data.id) {
    console.error('[API] Invalid playlist data received')
    throw new Error("Invalid playlist data received")
  }

  // console.log('[API] Playlist info fetched successfully')
  return data
}


async function getTracks(accessToken, id) {
  // console.log('[API] Calling Spotify API: GET /v1/playlists/' + id + '/tracks')
  let tracks = []
  let url = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`
  let page = 1

  while (url) {
    // console.log('[API] Fetching tracks page', page)
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })

    if (!response.ok) {
      console.error('[API] Failed to fetch tracks - Status:', response.status)
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch tracks: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data.items)) {
      console.error('[API] Invalid tracks data received')
      throw new Error("Invalid tracks data received")
    }

    // console.log('[API] Received', data.items.length, 'tracks on page', page)
    tracks = tracks.concat(data.items)
    url = data.next
    page++
  }

  console.log('[API] Total tracks fetched:', tracks.length)
  return tracks
}

async function fetchGenresForTracks(tracks, token) {
  // console.log('[API] Fetching artist genres from Spotify')

  // Get unique artist IDs from all tracks
  const artistIds = new Set()
  tracks.forEach(item => {
    if (item.track && item.track.artists) {
      item.track.artists.forEach(artist => {
        artistIds.add(artist.id)
      })
    }
  })

  const uniqueArtistIds = [...artistIds]
  // console.log('[API] Found', uniqueArtistIds.length, 'unique artists')

  if (uniqueArtistIds.length === 0) {
    return {}
  }

  // Fetch artists in batches of 50 (Spotify API limit)
  const artistGenreMap = {}

  for (let i = 0; i < uniqueArtistIds.length; i += 50) {
    const batch = uniqueArtistIds.slice(i, i + 50)
    const url = `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`

    // console.log('[API] Fetching artist batch', Math.floor(i / 50) + 1, '(' + batch.length + ' artists)')

    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token
      }
    })

    if (!response.ok) {
      console.error('[API] Failed to fetch artists - Status:', response.status)
      continue
    }

    const data = await response.json()

    if (data.artists) {
      data.artists.forEach(artist => {
        if (artist && artist.genres && artist.genres.length > 0) {
          artistGenreMap[artist.id] = artist.genres.join(', ')
        }
      })
    }
  }

  // console.log('[API] Artist genres fetched, found genres for', Object.keys(artistGenreMap).length, 'artists')

  // Map genres to tracks - combine genres from ALL artists
  const trackGenreMap = {}
  tracks.forEach(item => {
    if (item.track && item.track.artists) {
      // Collect genres from all artists on this track
      const allGenres = new Set() // Use Set to avoid duplicates

      item.track.artists.forEach(artist => {
        if (artistGenreMap[artist.id]) {
          // Split genres and add each one to the set
          artistGenreMap[artist.id].split(', ').forEach(genre => {
            if (genre.trim()) {
              allGenres.add(genre.trim())
            }
          })
        }
      })

      // Convert Set back to comma-separated string
      if (allGenres.size > 0) {
        trackGenreMap[item.track.id] = [...allGenres].join(', ')
      }
    }
  })

  return trackGenreMap
}

async function processPendingChanges(playlistId, token) {
  const newConnection = require('../db/connection')
  const con = newConnection()

  return new Promise((resolve, reject) => {
    // Get pending changes for this playlist
    const query = "SELECT * FROM PendingChanges WHERE PlaylistId = ? AND ChangeType = 'REMOVE_TRACK'"

    con.query(query, [playlistId], async (err, results) => {
      if (err) {
        con.end()
        console.error('[PLAYLIST] Error fetching pending changes:', err.message)
        reject(err)
        return
      }

      if (results.length === 0) {
        con.end()
        console.log('[PLAYLIST] No pending changes found')
        resolve()
        return
      }

      console.log('[PLAYLIST] Found', results.length, 'pending track removals')

      // Process each removal
      for (const change of results) {
        try {
          console.log('[PLAYLIST] Removing track', change.TrackId, 'from Spotify playlist')

          // Make Spotify API call to remove track
          const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tracks: [
                { uri: `spotify:track:${change.TrackId}` }
              ]
            })
          })

          if (response.ok) {
            // console.log('[PLAYLIST] Successfully removed track from Spotify')

            // Delete the pending change record
            await new Promise((resolve2, reject2) => {
              con.query('DELETE FROM PendingChanges WHERE ChangeId = ?', [change.ChangeId], (err2) => {
                if (err2) reject2(err2)
                else resolve2()
              })
            })
          } else {
            console.error('[PLAYLIST] Failed to remove track from Spotify:', response.status)
          }
        } catch (error) {
          console.error('[PLAYLIST] Error processing pending change:', error.message)
        }
      }

      con.end()
      // console.log('[PLAYLIST] Finished processing pending changes')
      resolve()
    })
  })
}

module.exports = app
