const newConnection = require('./connection');

async function addPlaylists(playlists, userId) {
  const con = newConnection();

  try {
    console.log('Connected to the database!');

    for (const playlist of playlists) {
      let playlistId = playlist.id;
      let playlistName = playlist.name;
      let playlistDescription = playlist.description;

      let insert = `
                    INSERT INTO Playlist (PlaylistId, PlaylistName, PlaylistDescription, UserId) VALUES (?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    PlaylistName = VALUES(PlaylistName), PlaylistDescription = VALUES(PlaylistDescription)`;

      con.query(insert, [playlistId, playlistName, playlistDescription, userId], function (err, result) {
        if (err) throw err;
        console.log(`Playlist ${playlistName} inserted/updated`);
      });

    }

  } catch (error) {
    console.error('Error while interacting with the database:', error);
  } finally {
    con.end((endErr) => {
      if (endErr) {
        console.error('Error while closing the database connection:', endErr);
      } else {
        console.log('Connection closed gracefully.');
      }
    });
  }
}

module.exports = { addPlaylists };
