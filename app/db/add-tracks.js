const newConnection = require('./connection');

async function addTracks(tracks) {
  const con = newConnection();

  try {
    console.log('Connected to the database!!!');

    for (const item of tracks) {
      let trackId = item.track.id;
      let trackName = item.track.name;
      let album = item.track.album.name;

      let insert = `
                    INSERT INTO Track (TrackId, TrackName, Album) VALUES (?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    TrackName = VALUES(TrackName), Tlbum = VALUES(Album)`;

      con.query(insert, [trackId, trackName, album], function (err, result) {
        if (err) throw err;
        console.log(`track ${trackName} inserted/updated`);
      });

      let ArtistId = item.track.artist.id;

      insert = `
                INSERT INTO TrackArtist (TrackId)`

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

module.exports = { addTracks };
