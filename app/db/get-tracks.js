const newConnection = require('./connection');

async function getPlaylistTracks(playlistId) {
  console.log('[DB] getPlaylistTracks - Fetching tracks for playlist:', playlistId);
  const con = newConnection();

  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        t.TrackId,
        t.TrackName,
        t.Album,
        t.AlbumImageURL,
        t.DurationMs,
        GROUP_CONCAT(DISTINCT a.ArtistName ORDER BY a.ArtistName SEPARATOR ', ') as Artists,
        GROUP_CONCAT(DISTINCT a.ArtistId ORDER BY a.ArtistName SEPARATOR ',') as ArtistIds
      FROM PlaylistTrack pt
      JOIN Track t ON pt.TrackId = t.TrackId
      LEFT JOIN TrackArtist ta ON t.TrackId = ta.TrackId
      LEFT JOIN Artist a ON ta.ArtistId = a.ArtistId
      WHERE pt.PlaylistId = ?
      GROUP BY t.TrackId, t.TrackName, t.Album, t.AlbumImageURL, t.DurationMs
      ORDER BY t.TrackName
    `;
    
    con.query(query, [playlistId], function(err, results) {
      con.end();
      
      if (err) {
        console.error('[DB] getPlaylistTracks - Error:', err.message);
        reject(err);
        return;
      }
      
      console.log('[DB] getPlaylistTracks - Found', results.length, 'tracks');
      resolve(results);
    });
  });
}

async function getTrackGenres(trackIds) {
  if (!trackIds || trackIds.length === 0) {
    return {};
  }

  console.log('[DB] getTrackGenres - Fetching genres for', trackIds.length, 'tracks');
  const con = newConnection();

  return new Promise((resolve, reject) => {
    const placeholders = trackIds.map(() => '?').join(',');
    const query = `
      SELECT TrackId, GROUP_CONCAT(DISTINCT TrackGenre SEPARATOR ', ') as Genres
      FROM ArtistGenre
      WHERE TrackId IN (${placeholders})
      GROUP BY TrackId
    `;
    
    con.query(query, trackIds, function(err, results) {
      con.end();
      
      if (err) {
        console.error('[DB] getTrackGenres - Error:', err.message);
        reject(err);
        return;
      }
      
      const genreMap = {};
      results.forEach(row => {
        genreMap[row.TrackId] = row.Genres;
      });
      
      console.log('[DB] getTrackGenres - Found genres for', results.length, 'tracks');
      resolve(genreMap);
    });
  });
}

module.exports = { getPlaylistTracks, getTrackGenres };
