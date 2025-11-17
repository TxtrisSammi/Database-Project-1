const newConnection = require('./connection');

async function addGenre(artistId, artist, trackId) {
  const con = newConnection();
  

  try {
    console.log('Connected to the database!');
    
    let genres = artist.genres
    let genreString = "";

    genres.forEach((genre, index) => {
        genreString += genre;
        if (index < genre.length) {
            genreString += ", ";
        }
    })

    console.log(genreString);

    

    let insert = `
                INSERT INTO ArtistGenre (TrackId, TrackGenre) VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE 
                TrackId = VALUES(TrackId) TrackGenre = VALUES(TrackGenre)`;

      con.query(insert, [trackId, genreString], function (err, result) {
        if (err) throw err;
        console.log(`ArtistGenre ${TrackId} ${Genre} updated `);
      });


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

module.exports = { addGenre };


