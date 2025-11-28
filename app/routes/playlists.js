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
    res.render("playlist.ejs", { 
      playlist: playlist, 
      tracks: tracks, 
      genres: genres,
      userId: req.session.userId || ''
    })

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
    const result = await processPendingChanges(id, token)
    
    // If playlist was created in Spotify, redirect to home so user can refresh
    if (result && result.redirectToHome) {
      console.log('[PLAYLIST] Playlist created in Spotify, redirecting to home')
      return res.redirect('/user')
    }

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

app.get("/create-playlist", async (req, res, next) => {
  console.log('[PLAYLIST] /create-playlist - Rendering create playlist page')
  try {
    res.render("create-playlist.ejs", { 
      userId: req.session.userId || ''
    })
  } catch (error) {
    console.error('[PLAYLIST] Error in /create-playlist route:', error.message)
    next(error)
  }
})

app.post("/create-playlist/preview", async (req, res, next) => {
  console.log('[PLAYLIST] /create-playlist/preview - Previewing tracks')
  try {
    const { artist, genre, album, trackName } = req.body
    
    const tracks = await searchTracks({ artist, genre, album, trackName })
    
    res.json({ success: true, tracks, count: tracks.length })
  } catch (error) {
    console.error('[PLAYLIST] Error in /create-playlist/preview route:', error.message)
    res.status(500).json({ error: "Failed to preview tracks" })
  }
})

app.post("/create-playlist", async (req, res, next) => {
  console.log('[PLAYLIST] /create-playlist - Creating new playlist')
  try {
    const { name, description, trackIds, userId } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Playlist name is required" })
    }
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" })
    }
    
    // Create local playlist (reuse existing logic from API route)
    const newConnection = require('../db/connection')
    const con = newConnection()
    
    const uuid = require('crypto').randomUUID().substring(0, 8)
    const timestamp = Date.now()
    const playlistId = `local_${uuid}_${timestamp}`
    
    // Create playlist
    await new Promise((resolve, reject) => {
      const query = `
        INSERT INTO Playlist (PlaylistId, PlaylistName, PlaylistDescription, ImageURL, UserId, IsLocalOnly) 
        VALUES (?, ?, ?, NULL, ?, TRUE)
      `
      
      con.query(query, [playlistId, name.trim(), description?.trim() || null, userId], (err, result) => {
        if (err) {
          console.error('[PLAYLIST] Error creating playlist:', err.message)
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
    
    // Add tracks to playlist
    if (trackIds && trackIds.length > 0) {
      for (const trackId of trackIds) {
        await new Promise((resolve, reject) => {
          const query = "INSERT INTO PlaylistTrack (TrackId, PlaylistId) VALUES (?, ?)"
          
          con.query(query, [trackId, playlistId], (err, result) => {
            if (err) {
              console.error('[PLAYLIST] Error adding track:', err.message)
              reject(err)
            } else {
              resolve(result)
            }
          })
        })
      }
    }
    
    // Create pending change
    await new Promise((resolve, reject) => {
      const query = "INSERT INTO PendingChanges (PlaylistId, PlaylistName, TrackId, TrackName, UserId, ChangeType) VALUES (?, ?, NULL, NULL, ?, 'CREATE_PLAYLIST')"
      
      con.query(query, [playlistId, name.trim(), userId], (err, result) => {
        if (err) {
          console.error('[PLAYLIST] Error creating pending change:', err.message)
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
    
    con.end()
    console.log('[PLAYLIST] Playlist created successfully:', playlistId)
    res.json({ success: true, playlistId })
    
  } catch (error) {
    console.error('[PLAYLIST] Error in /create-playlist route:', error.message)
    res.status(500).json({ error: "Failed to create playlist" })
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
    const query = "SELECT * FROM PendingChanges WHERE PlaylistId = ? AND ChangeType IN ('REMOVE_TRACK', 'CREATE_PLAYLIST')"

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

      console.log('[PLAYLIST] Found', results.length, 'pending changes')

      // Check if we need to create the playlist in Spotify first
      const createPlaylistChange = results.find(c => c.ChangeType === 'CREATE_PLAYLIST')
      
      if (createPlaylistChange) {
        try {
          console.log('[PLAYLIST] Creating playlist in Spotify for local playlist:', playlistId)
          const newSpotifyId = await createPlaylistInSpotify(playlistId, token, con)
          
          if (newSpotifyId) {
            console.log('[PLAYLIST] Successfully created in Spotify with ID:', newSpotifyId)
            
            // Delete the local playlist and pending change
            await new Promise((resolve2, reject2) => {
              con.query('DELETE FROM PendingChanges WHERE ChangeId = ?', [createPlaylistChange.ChangeId], (err2) => {
                if (err2) reject2(err2)
                else resolve2()
              })
            })
            
            // Delete the local playlist (this will be replaced by the Spotify sync)
            await new Promise((resolve2, reject2) => {
              con.query('DELETE FROM Playlist WHERE PlaylistId = ?', [playlistId], (err2) => {
                if (err2) reject2(err2)
                else resolve2()
              })
            })
            
            con.end()
            console.log('[PLAYLIST] Local playlist deleted, user should refresh to see Spotify version')
            resolve({ redirectToHome: true })
            return
          }
        } catch (error) {
          console.error('[PLAYLIST] Error creating playlist in Spotify:', error.message)
          con.end()
          reject(error)
          return
        }
      }

      // Process track removals
      const trackRemovals = results.filter(c => c.ChangeType === 'REMOVE_TRACK')
      
      for (const change of trackRemovals) {
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
      console.log('[PLAYLIST] Finished processing pending changes')
      resolve()
    })
  })
}

async function createPlaylistInSpotify(localPlaylistId, token, con) {
  // Get playlist details from database
  const playlist = await new Promise((resolve, reject) => {
    con.query('SELECT * FROM Playlist WHERE PlaylistId = ?', [localPlaylistId], (err, results) => {
      if (err) reject(err)
      else resolve(results[0])
    })
  })

  if (!playlist) {
    throw new Error('Local playlist not found')
  }

  // Get user ID from session (we'll need to get this from the playlist)
  const userId = playlist.UserId

  // Create playlist in Spotify
  const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: playlist.PlaylistName,
      description: playlist.PlaylistDescription || '',
      public: false
    })
  })

  if (!createResponse.ok) {
    throw new Error(`Failed to create playlist in Spotify: ${createResponse.status}`)
  }

  const newPlaylist = await createResponse.json()
  console.log('[PLAYLIST] Created playlist in Spotify:', newPlaylist.id)

  // Get tracks from local playlist
  const tracks = await new Promise((resolve, reject) => {
    con.query('SELECT TrackId FROM PlaylistTrack WHERE PlaylistId = ?', [localPlaylistId], (err, results) => {
      if (err) reject(err)
      else resolve(results)
    })
  })

  // Add tracks to Spotify playlist (in batches of 100)
  if (tracks.length > 0) {
    const trackUris = tracks.map(t => `spotify:track:${t.TrackId}`)
    
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100)
      
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: batch
        })
      })

      if (!addTracksResponse.ok) {
        console.error('[PLAYLIST] Failed to add tracks batch to Spotify playlist')
      }
    }
  }

  return newPlaylist.id
}

async function searchTracks(filters) {
  const newConnection = require('../db/connection')
  const con = newConnection()
  
  return new Promise((resolve, reject) => {
    let whereClauses = []
    let havingClauses = []
    let params = []
    
    // Build WHERE and HAVING clauses based on filters
    
    // Album filter (direct on Track table)
    if (filters.album && filters.album.trim()) {
      const albumTerms = parseFilterInput(filters.album)
      if (albumTerms.length > 0) {
        const albumConditions = albumTerms.map(term => {
          if (term.exact) {
            params.push(term.value)
            return 't.Album = ?'
          } else {
            params.push(`%${term.value}%`)
            return 't.Album LIKE ?'
          }
        })
        whereClauses.push(`(${albumConditions.join(' OR ')})`)
      }
    }
    
    // Track name filter (direct on Track table)
    if (filters.trackName && filters.trackName.trim()) {
      const trackTerms = parseFilterInput(filters.trackName)
      if (trackTerms.length > 0) {
        const trackConditions = trackTerms.map(term => {
          if (term.exact) {
            params.push(term.value)
            return 't.TrackName = ?'
          } else {
            params.push(`%${term.value}%`)
            return 't.TrackName LIKE ?'
          }
        })
        whereClauses.push(`(${trackConditions.join(' OR ')})`)
      }
    }
    
    // Artist filter (on aggregated data)
    if (filters.artist && filters.artist.trim()) {
      const artistTerms = parseFilterInput(filters.artist)
      if (artistTerms.length > 0) {
        const artistConditions = artistTerms.map(term => {
          if (term.exact) {
            params.push(`%${term.value}%`)
            return 'Artists LIKE ?'
          } else {
            params.push(`%${term.value}%`)
            return 'Artists LIKE ?'
          }
        })
        havingClauses.push(`(${artistConditions.join(' OR ')})`)
      }
    }
    
    // Genre filter (on aggregated data)
    if (filters.genre && filters.genre.trim()) {
      const genreTerms = parseFilterInput(filters.genre)
      if (genreTerms.length > 0) {
        const genreConditions = genreTerms.map(term => {
          if (term.exact) {
            params.push(`%${term.value}%`)
            return 'Genres LIKE ?'
          } else {
            params.push(`%${term.value}%`)
            return 'Genres LIKE ?'
          }
        })
        havingClauses.push(`(${genreConditions.join(' OR ')})`)
      }
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''
    const havingClause = havingClauses.length > 0 ? 'HAVING ' + havingClauses.join(' AND ') : ''
    
    const query = `
      SELECT DISTINCT 
        t.TrackId,
        t.TrackName,
        t.Album,
        t.AlbumImageURL,
        t.DurationMs,
        GROUP_CONCAT(DISTINCT a.ArtistName SEPARATOR ', ') as Artists,
        GROUP_CONCAT(DISTINCT a.ArtistId SEPARATOR ',') as ArtistIds,
        GROUP_CONCAT(DISTINCT ag.TrackGenre SEPARATOR ', ') as Genres
      FROM Track t
      LEFT JOIN TrackArtist ta ON t.TrackId = ta.TrackId
      LEFT JOIN Artist a ON ta.ArtistId = a.ArtistId
      LEFT JOIN ArtistGenre ag ON t.TrackId = ag.TrackId
      ${whereClause}
      GROUP BY t.TrackId, t.TrackName, t.Album, t.AlbumImageURL, t.DurationMs
      ${havingClause}
      ORDER BY t.TrackName
    `
    
    console.log('[PLAYLIST] Search query:', query)
    console.log('[PLAYLIST] Search params:', params)
    
    con.query(query, params, (err, results) => {
      con.end()
      if (err) {
        console.error('[PLAYLIST] Error searching tracks:', err.message)
        reject(err)
      } else {
        console.log('[PLAYLIST] Found', results.length, 'matching tracks')
        resolve(results)
      }
    })
  })
}

function parseFilterInput(input) {
  if (!input) return []
  
  const terms = []
  const regex = /"([^"]*)"|([^,]+)/g
  let match
  
  while ((match = regex.exec(input)) !== null) {
    const term = match[1] || match[2]
    if (term && term.trim()) {
      const trimmed = term.trim().toLowerCase()
      terms.push({
        value: trimmed,
        exact: !!match[1]
      })
    }
  }
  
  return terms
}

module.exports = app
