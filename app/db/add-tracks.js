const newConnection = require('./connection');
const { addGenre } = require("./add-genre")

async function addTracks(tracks, playlistId, token) {
  // console.log('[DB] addTracks - Starting for', tracks.length, 'tracks (Playlist ID:', playlistId + ')')
  const con = newConnection();

  // Cache to avoid fetching the same artist multiple times
  const artistCache = {};

  try {
    // console.log('[DB] addTracks - Connected to the database');

    for (const item of tracks) {
      let trackId = item.track.id;
      let trackName = item.track.name;
      let album = item.track.album.name;
      let albumImageURL = (item.track.album.images && item.track.album.images.length > 0)
        ? item.track.album.images[0].url
        : null;
      let durationMs = item.track.duration_ms || 0;

      // Insert track and wait for completion
      await new Promise((resolve, reject) => {
        let insert = `
                      INSERT INTO Track (TrackId, TrackName, Album, AlbumImageURL, DurationMs) VALUES (?, ?, ?, ?, ?) 
                      ON DUPLICATE KEY UPDATE 
                      TrackName = VALUES(TrackName), Album = VALUES(Album), AlbumImageURL = VALUES(AlbumImageURL), DurationMs = VALUES(DurationMs)`;

        con.query(insert, [trackId, trackName, album, albumImageURL, durationMs], function (err, result) {
          if (err) {
            console.error('[DB] addTracks - Error inserting track:', trackName, err.message)
            reject(err);
          } else {
            // console.log('[DB] addTracks - Track inserted/updated:', trackName);
            resolve();
          }
        });
      });

      // Insert playlist-track relation and wait
      await new Promise((resolve, reject) => {
        let insert = `
                  INSERT INTO PlaylistTrack (TrackId, PlaylistId) VALUES (?, ?)
                  ON DUPLICATE KEY UPDATE 
                  TrackId = VALUES(TrackId)`;

        con.query(insert, [trackId, playlistId], function (err, res) {
          if (err) {
            console.error('[DB] addTracks - Error updating playlist-track relation:', err.message)
            reject(err);
          } else {
            // console.log('[DB] addTracks - Updated playlist-track relation for playlist:', playlistId)
            resolve();
          }
        })
      });

      let artists = item.track.artists;
      for (let i = 0; i < artists.length; i++) {
        let artistId = artists[i].id;
        let artistName = artists[i].name;

        // Insert artist and wait
        await new Promise((resolve, reject) => {
          let insert = `
                  INSERT INTO Artist (ArtistId, ArtistName) VALUES(?, ?)
                  ON DUPLICATE KEY UPDATE
                  ArtistName = VALUES(ArtistName)`
          con.query(insert, [artistId, artistName], function (err, result) {
            if (err) {
              console.error('[DB] addTracks - Error inserting artist:', artistName, err.message)
              reject(err);
            } else {
              // console.log('[DB] addTracks - Artist inserted/updated:', artistName)
              resolve();
            }
          })
        });

        // Check cache first before making API call
        if (!artistCache[artistId]) {
          // console.log('[DB] addTracks - Fetching artist info for:', artistId, '(not in cache)')
          artistCache[artistId] = await getArtistInfo(token, artistId)
        } else {
          // console.log('[DB] addTracks - Using cached artist info for:', artistId)
        }

        let artistInfo = artistCache[artistId]

        // Add genre and wait for completion
        await addGenre(artistId, artistInfo, trackId)

        // Insert track-artist relation and wait
        await new Promise((resolve, reject) => {
          let insert = `
                  INSERT INTO TrackArtist (TrackId, ArtistId) VALUES (?, ?)
                  ON DUPLICATE KEY UPDATE
                  ArtistId = VALUES(ArtistId)`

          con.query(insert, [trackId, artistId], function (err, result) {
            if (err) {
              console.error('[DB] addTracks - Error inserting track-artist relation:', err.message)
              reject(err);
            } else {
              // console.log('[DB] addTracks - TrackArtist inserted/updated for artist:', artistId)
              resolve();
            }
          })
        });
      }
    }

  } catch (error) {
    console.error('[DB] addTracks - Error while interacting with the database:', error.message);
  } finally {
    con.end((endErr) => {
      if (endErr) {
        console.error('[DB] addTracks - Error while closing the database connection:', endErr.message);
      } else {
        // console.log('[DB] addTracks - Connection closed gracefully');
      }
    });
  }
}

async function getArtistInfo(accessToken, id) {
  // console.log('[API] Calling Spotify API: GET /v1/artists/' + id)
  let artists = []
  let url = `https://api.spotify.com/v1/artists/${id}`

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })

    if (!response.ok) {
      console.error('[API] Failed to fetch artist info - Status:', response.status)
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch artists: ${response.status}`)
    }

    const data = await response.json();
    // console.log('[API] Artist info fetched successfully for:', data.name)
    artists = data;
    url = data.next;
  }

  return artists;
}

module.exports = { addTracks };

