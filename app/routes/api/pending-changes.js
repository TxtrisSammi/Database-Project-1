const express = require("express")
const app = express.Router()
const newConnection = require("../../db/connection")

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
