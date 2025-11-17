const newConnection = require('./connection');
const { addGenre } = require("./add-genre")

async function addTracks(tracks, playlistId, token) {
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

      insert = `
                INSERT INTO PlaylistTrack (TrackId, PlaylistId) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE 
                TrackId = VALUES(TrackId)`;

      con.query(insert, [trackId, playlistId], function (err, res) {
        if (err) throw err;
        console.log(`Updated playlist ${playlistId}`);
      })
      let artistId = "";
      let artistName = "";
      
      let artists = item.track.artists;
      for (let i = 0; i < artists.length; i++) {
        artistId += artists[i].id;
        artistName += artists[i].name;
        insert = `
                INSERT INTO Artist (ArtistId, ArtistName) VALUES(?, ?)
                ON DUPLICATE KEY UPDATE
                ArtistName = VALUES(ArtistName)`;
        con.query(insert, [artistId, artistName], function(err, result) {
          if (err) throw err;
          console.log(`Artist ${artistName} Inserted/Updated`);
        } )

        let artistInfo = await getArtistInfo(token, artistId);

        addGenre(artistId, artistInfo, trackId);
      }

      insert = `
                INSERT INTO TrackArtist (TrackId, ArtistId) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE
                ArtistId = VALUES(ArtistId)`;

      con.query(insert, [trackId, artistId], function (err, result) {
        if (err) throw err;
        console.log(`TrackArtist ${artistId} inserted/updated`);
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

async function getArtistInfo(accessToken, id) {
  let artists = '';
  let url =  `https://api.spotify.com/v1/artists/${id}`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken 
      }
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch artists: ${response.status}`)
    }

    const data = await response.json();
    artists = data;
    url = data.next;
  }

  return artists;
}

module.exports = { addTracks };

