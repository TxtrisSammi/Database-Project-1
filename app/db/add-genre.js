const newConnection = require('./connection');

async function addGenre(artistId, artist, trackId) {
    console.log('[DB] addGenre - Starting for artist:', artistId, 'track:', trackId)
    const con = newConnection();

    try {
        console.log('[DB] addGenre - Connected to the database');

        let genres = artist.genres
        let genreString = "";

        genres.forEach((genre, index) => {
            genreString += genre;
            if (index < genre.length) {
                genreString += ", ";
            }
        })

        console.log('[DB] addGenre - Genres for artist:', genreString || 'none')

        // Insert TrackGenre and wait
        await new Promise((resolve, reject) => {
          let insert = `
                  INSERT INTO TrackGenre (ArtistId, ArtistGenre) VALUES (?, ?) 
                  ON DUPLICATE KEY UPDATE 
                  ArtistId = VALUES(ArtistId)`;

          con.query(insert, [artistId, genreString], function (err, result) {
              if (err) {
                  console.error('[DB] addGenre - Error inserting TrackGenre:', err.message)
                  reject(err);
              } else {
                  console.log('[DB] addGenre - TrackGenre inserted/updated for artist:', artistId);
                  resolve();
              }
          });
        });

        // Insert ArtistGenre and wait
        await new Promise((resolve, reject) => {
          let insert = `
                  INSERT INTO ArtistGenre (TrackId, TrackGenre) VALUES (?, ?) 
                  ON DUPLICATE KEY UPDATE 
                  TrackId = VALUES(TrackId)`;

          con.query(insert, [trackId, genreString], function (err, result) {
              if (err) {
                  console.error('[DB] addGenre - Error inserting ArtistGenre:', err.message)
                  reject(err);
              } else {
                  console.log('[DB] addGenre - ArtistGenre inserted/updated for track:', trackId);
                  resolve();
              }
          });
        });

    } catch (error) {
        console.error('[DB] addGenre - Error while interacting with the database:', error.message);
        throw error;
    } finally {
        con.end((endErr) => {
            if (endErr) {
                console.error('[DB] addGenre - Error while closing the database connection:', endErr.message);
            } else {
                console.log('[DB] addGenre - Connection closed gracefully');
            }
        });
    }
}

module.exports = { addGenre };


