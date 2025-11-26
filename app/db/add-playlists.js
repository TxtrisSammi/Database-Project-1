const newConnection = require('./connection');

async function addPlaylists(playlists, userId) {
  console.log('[DB] addPlaylists - Starting for', playlists.length, 'playlists (User ID:', userId + ')')
  const con = newConnection();

  try {
    console.log('[DB] addPlaylists - Connected to the database');

    for (const playlist of playlists) {
      let playlistId = playlist.id;
      let playlistName = playlist.name;
      let playlistDescription = playlist.description;
      let imageUrl = (playlist.images && playlist.images.length > 0) ? playlist.images[0].url : null;

      let insert = `
                    INSERT INTO Playlist (PlaylistId, PlaylistName, PlaylistDescription, ImageURL, UserId) VALUES (?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    PlaylistName = VALUES(PlaylistName), 
                    PlaylistDescription = VALUES(PlaylistDescription),
                    ImageURL = VALUES(ImageURL)`;

      con.query(insert, [playlistId, playlistName, playlistDescription, imageUrl, userId], function (err, result) {
        if (err) {
          console.error('[DB] addPlaylists - Error inserting playlist:', playlistName, err.message)
          throw err;
        }
        console.log('[DB] addPlaylists - Playlist inserted/updated:', playlistName);
      });

    }

  } catch (error) {
    console.error('[DB] addPlaylists - Error while interacting with the database:', error.message);
  } finally {
    con.end((endErr) => {
      if (endErr) {
        console.error('[DB] addPlaylists - Error while closing the database connection:', endErr.message);
      } else {
        console.log('[DB] addPlaylists - Connection closed gracefully');
      }
    });
  }
}

module.exports = { addPlaylists };
