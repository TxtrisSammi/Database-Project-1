const newConnection = require('./connection');

async function getPlaylists(userId) {
  console.log('[DB] getPlaylists - Fetching playlists for user:', userId);
  const con = newConnection();

  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM Playlist WHERE UserId = ? ORDER BY PlaylistName';
    
    con.query(query, [userId], function(err, results) {
      con.end();
      
      if (err) {
        console.error('[DB] getPlaylists - Error:', err.message);
        reject(err);
        return;
      }
      
      console.log('[DB] getPlaylists - Found', results.length, 'playlists');
      resolve(results);
    });
  });
}

module.exports = { getPlaylists };
