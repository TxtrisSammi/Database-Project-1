const newConnection = require('./connection');

async function addTracks(tracks, playlistId) {
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
                    TrackName = VALUES(TrackName), Album = VALUES(Album)`;

      con.query(insert, [trackId, trackName, album], function (err, result) {
        if (err) throw err;
        console.log(`track ${trackName} inserted/updated`);
      });

      let artistId = "";
      let artistName = "";
      
      let artists = item.track.artists;
      for (let i = 0; i < artists.length; i++) {
        artistId += artists[i].id;
        artistName += artists[i].name;
        insert = `
                INSERT INTO Artist (ArtistId, ArtistName) VALUES(?, ?)
                ON DUPLICATE KEY UPDATE
                ArtistName = VALUES(ArtistName)`
        con.query(insert, [artistId, artistName], function(err, result) {
          if (err) throw err;
          console.log(`Artist ${artistName} Inserted/Updated`)
        } )
      }

      insert = `
                INSERT INTO TrackArtist (TrackId, ArtistId) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE
                ArtistId = VALUES(ArtistId)`

      con.query(insert, [trackId, artistId], function (err, result) {
        if (err) throw err;
        console.log(`TrackArtist ${artistId} inserted/updated`)
      })

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
