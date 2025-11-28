const express = require("express")
const app = express.Router()
const newConnection = require("../../db/connection")
const { generateLocalPlaylistId } = require('../../utils/playlist-helpers')

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
    const playlistId = generateLocalPlaylistId()

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

module.exports = app
