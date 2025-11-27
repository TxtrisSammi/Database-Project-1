const { pool } = require("./connection")

async function addLikedSongs(tracks, userId) {
  // console.log('[DB] addLikedSongs - Starting for', tracks.length, 'liked songs (User ID:', userId + ')')
  const connection = await pool.promise().getConnection()

  try {
    // console.log('[DB] addLikedSongs - Connection acquired, beginning transaction')
    await connection.beginTransaction()

    let processed = 0
    for (const item of tracks) {
      if (!item.track) continue

      const track = item.track

      const [trackExists] = await connection.query(
        'SELECT track_id FROM Track WHERE track_id = ?',
        [track.id]
      )

      if (trackExists.length === 0) {
        await connection.query(
          'INSERT INTO Track (track_id, track_name, duration_ms, explicit, popularity) VALUES (?, ?, ?, ?, ?)',
          [track.id, track.name, track.duration_ms, track.explicit ? 1 : 0, track.popularity || 0]
        )
        // console.log('[DB] addLikedSongs - New track inserted:', track.name)
      }

      const [likeExists] = await connection.query(
        'SELECT * FROM LikedSongs WHERE user_id = ? AND track_id = ?',
        [userId, track.id]
      )

      if (likeExists.length === 0) {
        await connection.query(
          'INSERT INTO LikedSongs (user_id, track_id, added_at) VALUES (?, ?, ?)',
          [userId, track.id, item.added_at]
        )
        processed++
      }
    }

    await connection.commit()
    console.log('[DB] addLikedSongs - Transaction committed successfully,', processed, 'new likes added')
  } catch (error) {
    await connection.rollback()
    console.error('[DB] addLikedSongs - Error, rolling back transaction:', error.message)
  } finally {
    connection.release()
    console.log('[DB] addLikedSongs - Connection released')
  }
}

module.exports = { addLikedSongs }
