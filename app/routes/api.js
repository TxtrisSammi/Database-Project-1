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

// Delete a playlist from database
app.delete("/api/playlists/:playlistId", async (req, res) => {
  const { playlistId } = req.params

  const con = newConnection()

  try {
    // First, log to PendingChanges
    await new Promise((resolve, reject) => {
      const insertQuery = "INSERT INTO PendingChanges (PlaylistId, TrackId, ChangeType) VALUES (?, NULL, 'DELETE_PLAYLIST')"
      
      con.query(insertQuery, [playlistId], (err, result) => {
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

module.exports = app
