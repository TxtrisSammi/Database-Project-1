const express = require("express")
const app = express.Router()
const newConnection = require("../../db/connection")

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
          resolve(result)
        }
      })
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to remove genre" })
  }
})

module.exports = app
