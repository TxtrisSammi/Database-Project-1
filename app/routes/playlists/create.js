const express = require("express")
const app = express.Router()
const newConnection = require('../../db/connection')

const { 
  searchTracks, 
  generateLocalPlaylistId 
} = require('../../utils/playlist-helpers')

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
    
    // Create local playlist
    const con = newConnection()
    
    const playlistId = generateLocalPlaylistId()
    
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

module.exports = app
