const newConnection = require('./connection');

async function getLikedSongs(userId) {
  console.log('[DB] getLikedSongs - Fetching liked songs for user:', userId);
  const con = newConnection();

  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        t.TrackId,
        t.TrackName,
        t.Album,
        t.AlbumImageURL,
        GROUP_CONCAT(DISTINCT a.ArtistName ORDER BY a.ArtistName SEPARATOR ', ') as Artists,
        GROUP_CONCAT(DISTINCT a.ArtistId ORDER BY a.ArtistName SEPARATOR ',') as ArtistIds
      FROM PlaylistTrack pt
      JOIN Track t ON pt.TrackId = t.TrackId
      LEFT JOIN TrackArtist ta ON t.TrackId = ta.TrackId
      LEFT JOIN Artist a ON ta.ArtistId = a.ArtistId
      WHERE pt.PlaylistId = ?
      GROUP BY t.TrackId, t.TrackName, t.Album, t.AlbumImageURL
      ORDER BY t.TrackName
    `;
    
    // Use a special playlist ID for liked songs
    const likedSongsId = userId + '_liked';
    
    con.query(query, [likedSongsId], function(err, results) {
      con.end();
      
      if (err) {
        console.error('[DB] getLikedSongs - Error:', err.message);
        reject(err);
        return;
      }
      
      console.log('[DB] getLikedSongs - Found', results.length, 'liked songs');
      resolve(results);
    });
  });
}

module.exports = { getLikedSongs };
