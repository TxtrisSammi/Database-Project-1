const express = require("express")
const app = express.Router()
const newConnection = require("../db/connection")

// Add a genre to a track
app.post("/api/tracks/:trackId/genres", async (req, res) => {
  const { trackId } = req.params
  const { genre } = req.body

  if (!genre || !genre.trim()) {
    return res.status(400).json({ error: "Genre is required" })
  }

  const con = newConnection()

  try {
    await new Promise((resolve, reject) => {
      const query = `
        INSERT INTO ArtistGenre (TrackId, TrackGenre) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE TrackGenre = VALUES(TrackGenre)
      `
      
      con.query(query, [trackId, genre.trim()], (err, result) => {
        con.end()
        if (err) {
          console.error('[API] Error adding genre:', err.message)
          reject(err)
        } else {
          // console.log('[API] Genre added:', genre, 'to track:', trackId)
          resolve(result)
        }
      })
    })

    res.json({ success: true, genre: genre.trim() })
  } catch (error) {
    res.status(500).json({ error: "Failed to add genre" })
  }
})

// Remove a genre from a track
app.delete("/api/tracks/:trackId/genres/:genre", async (req, res) => {
  const { trackId, genre } = req.params

  const con = newConnection()

  try {
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM ArtistGenre WHERE TrackId = ? AND TrackGenre = ?"
      
      con.query(query, [trackId, decodeURIComponent(genre)], (err, result) => {
        con.end()
        if (err) {
          console.error('[API] Error removing genre:', err.message)
          reject(err)
        } else {
          // console.log('[API] Genre removed:', genre, 'from track:', trackId)
          resolve(result)
        }
      })
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to remove genre" })
  }
})

// Remove a track from a playlist
app.delete("/api/playlists/:playlistId/tracks/:trackId", async (req, res) => {
  const { playlistId, trackId } = req.params

  const con = newConnection()

  try {
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM PlaylistTrack WHERE PlaylistId = ? AND TrackId = ?"
      
      con.query(query, [playlistId, trackId], (err, result) => {
        con.end()
        if (err) {
          console.error('[API] Error removing track from playlist:', err.message)
          reject(err)
        } else {
          // console.log('[API] Track removed:', trackId, 'from playlist:', playlistId)
          resolve(result)
        }
      })
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to remove track" })
  }
})

// Create a local playlist from filtered results
app.post("/api/playlists/create-local", async (req, res) => {
  const { name, description, trackIds, userId } = req.body

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Playlist name is required" })
  }

  if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
    return res.status(400).json({ error: "At least one track is required" })
  }

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }

  const con = newConnection()

  try {
    // Generate unique ID: <uuid>_<timestamp>
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
          console.error('[API] Error creating local playlist:', err.message)
          reject(err)
        } else {
          console.log('[API] Local playlist created:', playlistId)
          resolve(result)
        }
      })
    })

    // Add tracks to playlist
    for (const trackId of trackIds) {
      await new Promise((resolve, reject) => {
        const query = "INSERT INTO PlaylistTrack (TrackId, PlaylistId) VALUES (?, ?)"
        
        con.query(query, [trackId, playlistId], (err, result) => {
          if (err) {
            console.error('[API] Error adding track to playlist:', err.message)
            reject(err)
          } else {
            resolve(result)
          }
        })
      })
    }

    // Create pending change for Spotify creation
    await new Promise((resolve, reject) => {
      const query = "INSERT INTO PendingChanges (PlaylistId, PlaylistName, TrackId, TrackName, UserId, ChangeType) VALUES (?, ?, NULL, NULL, ?, 'CREATE_PLAYLIST')"
      
      con.query(query, [playlistId, name.trim(), userId], (err, result) => {
        if (err) {
          console.error('[API] Error creating pending change:', err.message)
          reject(err)
        } else {
          resolve(result)
        }
      })
    })

    con.end()
    console.log('[API] Local playlist created successfully with', trackIds.length, 'tracks')
    res.json({ success: true, playlistId, trackCount: trackIds.length })
  } catch (error) {
    con.end()
    res.status(500).json({ error: "Failed to create local playlist" })
  }
})

// Delete a playlist from database
app.delete("/api/playlists/:playlistId", async (req, res) => {
  const { playlistId } = req.params

  const con = newConnection()

  try {
    // Get userId from playlist before deleting
    const playlist = await new Promise((resolve, reject) => {
      con.query('SELECT UserId, PlaylistName FROM Playlist WHERE PlaylistId = ?', [playlistId], (err, results) => {
        if (err) reject(err)
        else resolve(results[0])
      })
    })

    if (!playlist) {
      con.end()
      return res.status(404).json({ error: "Playlist not found" })
    }

    // First, log to PendingChanges
    await new Promise((resolve, reject) => {
      const insertQuery = "INSERT INTO PendingChanges (PlaylistId, PlaylistName, TrackId, TrackName, UserId, ChangeType) VALUES (?, ?, NULL, NULL, ?, 'DELETE_PLAYLIST')"
      
      con.query(insertQuery, [playlistId, playlist.PlaylistName, playlist.UserId], (err, result) => {
        if (err) {
          console.error('[API] Error logging playlist deletion to PendingChanges:', err.message)
          reject(err)
        } else {
          resolve(result)
        }
      })
    })

    // Then delete the playlist (cascade will handle related records)
    await new Promise((resolve, reject) => {
      const deleteQuery = "DELETE FROM Playlist WHERE PlaylistId = ?"
      
      con.query(deleteQuery, [playlistId], (err, result) => {
        con.end()
        if (err) {
          console.error('[API] Error deleting playlist:', err.message)
          reject(err)
        } else {
          console.log('[API] Playlist deleted:', playlistId)
          resolve(result)
        }
      })
    })

    res.json({ success: true })
  } catch (error) {
    con.end()
    res.status(500).json({ error: "Failed to delete playlist" })
  }
})

// Get pending changes for current user
app.get("/api/pending-changes", async (req, res) => {
  const userId = req.session?.userId

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  const con = newConnection()

  try {
    const changes = await new Promise((resolve, reject) => {
      const query = `
        SELECT *
        FROM PendingChanges
        WHERE UserId = ?
        ORDER BY CreatedAt DESC
      `
      
      con.query(query, [userId], (err, results) => {
        con.end()
        if (err) {
          console.error('[API] Error fetching pending changes:', err.message)
          reject(err)
        } else {
          resolve(results)
        }
      })
    })

    res.json({ success: true, changes })
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending changes" })
  }
})

// Cancel a pending change
app.delete("/api/pending-changes/:changeId", async (req, res) => {
  const { changeId } = req.params
  const userId = req.session?.userId

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  const con = newConnection()

  try {
    // Get the pending change details
    const change = await new Promise((resolve, reject) => {
      con.query('SELECT * FROM PendingChanges WHERE ChangeId = ? AND UserId = ?', [changeId, userId], (err, results) => {
        if (err) reject(err)
        else resolve(results[0])
      })
    })

    if (!change) {
      con.end()
      return res.status(404).json({ error: "Pending change not found" })
    }

    // Handle different change types
    if (change.ChangeType === 'REMOVE_TRACK') {
      // Re-add the track to the playlist
      await new Promise((resolve, reject) => {
        con.query('INSERT IGNORE INTO PlaylistTrack (TrackId, PlaylistId) VALUES (?, ?)', 
          [change.TrackId, change.PlaylistId], (err) => {
            if (err) reject(err)
            else resolve()
          })
      })
    } else if (change.ChangeType === 'CREATE_PLAYLIST') {
      // Delete the local playlist
      await new Promise((resolve, reject) => {
        con.query('DELETE FROM Playlist WHERE PlaylistId = ? AND IsLocalOnly = TRUE', 
          [change.PlaylistId], (err) => {
            if (err) reject(err)
            else resolve()
          })
      })
    }
    // For DELETE_PLAYLIST, we just remove the pending change (playlist already deleted locally)

    // Delete the pending change
    await new Promise((resolve, reject) => {
      con.query('DELETE FROM PendingChanges WHERE ChangeId = ?', [changeId], (err) => {
        con.end()
        if (err) reject(err)
        else resolve()
      })
    })

    res.json({ success: true })
  } catch (error) {
    con.end()
    console.error('[API] Error canceling pending change:', error.message)
    res.status(500).json({ error: "Failed to cancel pending change" })
  }
})

module.exports = app
