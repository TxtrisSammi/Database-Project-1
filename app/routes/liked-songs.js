const express = require("express")
const app = express.Router()
const { ensureValidToken } = require("../utils/tokenRefresh")
const { addTracks } = require("../db/add-tracks")
const { getLikedSongs: getLikedSongsFromDB } = require("../db/get-liked-songs")
const { getTrackGenres } = require("../db/get-tracks")
const { getTopGenre, getTopArtist, getGenreStats } = require("../db/get-playlist-stats")

app.get("/liked-songs", async (req, res, next) => {
  console.log('[LIKED-SONGS] /liked-songs - Loading liked songs from database')
  try {
    if (!req.session.userId) {
      console.log('[LIKED-SONGS] No userId in session, redirecting to /auth')
      return res.redirect("/auth")
    }

    // Load from database
    let dbTracks = await getLikedSongsFromDB(req.session.userId)
    let tracks = []
    let genres = {}

    if (dbTracks && dbTracks.length > 0) {
      // Convert DB format to expected format
      tracks = dbTracks.map(t => ({
        track: {
          id: t.TrackId,
          name: t.TrackName,
          album: { 
            name: t.Album,
            images: t.AlbumImageURL ? [{ url: t.AlbumImageURL }] : []
          },
          artists: t.Artists ? t.Artists.split(', ').map((name, idx) => ({
            name: name,
            id: t.ArtistIds ? t.ArtistIds.split(',')[idx] : ''
          })) : [],
          duration_ms: t.DurationMs || 0
        }
      }))

      // Get genres
      const trackIds = dbTracks.map(t => t.TrackId)
      genres = await getTrackGenres(trackIds)
    }

    const likedSongsPlaylistId = req.session.userId + '_liked'

    let top_genre = await getTopGenre(likedSongsPlaylistId)
    let genre_stats = await getGenreStats(likedSongsPlaylistId)
    let top_artist = await getTopArtist(likedSongsPlaylistId)

    // PLAYLIST STATS
    if (top_genre) {
      top_genre = {
        genre: top_genre.SingleGenre,
        count: top_genre.GenreCount
      }
    } else {
      top_genre = null;
    }

    if (top_artist) {
      top_artist = {
        artist: top_artist.ArtistName,
        count: top_artist.ArtistCount
      }
    } else {
      top_artist = null;
    }

    console.log('[LIKED-SONGS] Rendering liked-songs page with DB data')
    console.log('[LIKED-SONGS] Tracks:', tracks.length)
    res.render("liked-songs.ejs", { 
      tracks: tracks, 
      genres: genres,
      userId: req.session.userId || '',
      top_genre: top_genre, 
      genre_stats: genre_stats, 
      top_artist: top_artist 
    })
  } catch (error) {
    console.error('[LIKED-SONGS] Error in /liked-songs route:', error.message)
    next(error)
  }
})

app.post("/liked-songs/refresh", async (req, res, next) => {
  console.log('[LIKED-SONGS] /liked-songs/refresh - Fetching from Spotify')
  try {
    let token = await ensureValidToken(req)

    if (!token) {
      console.log('[LIKED-SONGS] No token available, redirecting to auth')
      return res.redirect("/auth")
    }

    let likedSongs
    try {
      // console.log('[LIKED-SONGS] Fetching liked songs from Spotify API')
      likedSongs = await getLikedSongs(token)
      // console.log('[LIKED-SONGS] Received', likedSongs.length, 'liked songs')
    } catch (error) {
      // Check for insufficient scope error
      if (error.message.includes("Insufficient client scope")) {
        console.log('[LIKED-SONGS] Insufficient scope - need to re-authenticate with proper scopes')
        req.session.authToken = null
        req.session.refreshToken = null
        return res.redirect("/auth")
      }

      if (error.message.includes("Token expired or invalid") && req.session.refreshToken) {
        console.log('[LIKED-SONGS] Token expired, attempting to refresh...')
        try {
          const { refreshAccessToken } = require("../utils/tokenRefresh")
          token = await refreshAccessToken(req.session.refreshToken)
          req.session.authToken = token
          console.log('[LIKED-SONGS] Token refreshed, retrying request with new token')
          likedSongs = await getLikedSongs(token)
          console.log('[LIKED-SONGS] Received', likedSongs.length, 'liked songs after refresh')
        } catch (refreshError) {
          console.error('[LIKED-SONGS] Failed to refresh token:', refreshError.message)
          req.session.authToken = null
          req.session.refreshToken = null
          return res.redirect("/auth")
        }
      } else {
        throw error
      }
    }

    if (req.session.userId) {
      // console.log('[LIKED-SONGS] Updating liked songs in database for user:', req.session.userId)
      // Use a special playlist ID for liked songs
      const likedSongsPlaylistId = req.session.userId + '_liked'
      
      // First, ensure the "Liked Songs" playlist exists in the database
      const newConnection = require('../db/connection')
      const con = newConnection()
      
      await new Promise((resolve, reject) => {
        const insertPlaylist = `
          INSERT INTO Playlist (PlaylistId, PlaylistName, PlaylistDescription, ImageURL, UserId) 
          VALUES (?, ?, ?, ?, ?) 
          ON DUPLICATE KEY UPDATE PlaylistName = VALUES(PlaylistName)
        `
        
        con.query(insertPlaylist, [
          likedSongsPlaylistId,
          'Liked Songs',
          'Your favorite tracks',
          null,
          req.session.userId
        ], function(err, result) {
          con.end()
          if (err) {
            console.error('[LIKED-SONGS] Error creating liked songs playlist:', err.message)
            reject(err)
          } else {
            // console.log('[LIKED-SONGS] Liked Songs playlist entry created/updated')
            resolve()
          }
        })
      })
      
      // Now add the tracks
      await addTracks(likedSongs, likedSongsPlaylistId, token)
    }

    console.log('[LIKED-SONGS] Redirecting back to liked-songs')
    res.redirect('/liked-songs')
  } catch (error) {
    console.error('[LIKED-SONGS] Error in /liked-songs/refresh route:', error.message)
    next(error)
  }
})

async function getLikedSongs(accessToken) {
  // console.log('[API] Calling Spotify API: GET /v1/me/tracks')
  let tracks = []
  let url = "https://api.spotify.com/v1/me/tracks?limit=50"
  let page = 1

  while (url) {
    // console.log('[API] Fetching liked songs page', page)
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })

    if (!response.ok) {
      console.error('[API] Failed to fetch liked songs - Status:', response.status)
      const errorBody = await response.text()
      console.error('[API] Error response body:', errorBody)

      // Check for scope error FIRST - this requires re-authentication
      if (errorBody.includes("Insufficient client scope")) {
        throw new Error("Insufficient client scope")
      }

      // Only treat 401 as token expiry (403 without scope error is something else)
      if (response.status === 401) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch liked songs: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data.items)) {
      console.error('[API] Invalid liked songs data received')
      throw new Error("Invalid liked songs data received")
    }

    // console.log('[API] Received', data.items.length, 'liked songs on page', page)
    tracks = tracks.concat(data.items)
    url = data.next
    page++
  }

  console.log('[API] Total liked songs fetched:', tracks.length)
  return tracks
}

async function fetchGenresForTracks(tracks, token) {
  console.log('[API] Fetching artist genres from Spotify')

  // Get unique artist IDs from all tracks
  const artistIds = new Set()
  tracks.forEach(item => {
    if (item.track && item.track.artists) {
      item.track.artists.forEach(artist => {
        artistIds.add(artist.id)
      })
    }
  })

  const uniqueArtistIds = [...artistIds]
  console.log('[API] Found', uniqueArtistIds.length, 'unique artists')

  if (uniqueArtistIds.length === 0) {
    return {}
  }

  // Fetch artists in batches of 50 (Spotify API limit)
  const artistGenreMap = {}

  for (let i = 0; i < uniqueArtistIds.length; i += 50) {
    const batch = uniqueArtistIds.slice(i, i + 50)
    const url = `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`

    console.log('[API] Fetching artist batch', Math.floor(i / 50) + 1, '(' + batch.length + ' artists)')

    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token
      }
    })

    if (!response.ok) {
      console.error('[API] Failed to fetch artists - Status:', response.status)
      continue
    }

    const data = await response.json()

    if (data.artists) {
      data.artists.forEach(artist => {
        if (artist && artist.genres && artist.genres.length > 0) {
          artistGenreMap[artist.id] = artist.genres.join(', ')
        }
      })
    }
  }

  console.log('[API] Artist genres fetched, found genres for', Object.keys(artistGenreMap).length, 'artists')

  // Map genres to tracks - combine genres from ALL artists
  const trackGenreMap = {}
  tracks.forEach(item => {
    if (item.track && item.track.artists) {
      // Collect genres from all artists on this track
      const allGenres = new Set() // Use Set to avoid duplicates

      item.track.artists.forEach(artist => {
        if (artistGenreMap[artist.id]) {
          // Split genres and add each one to the set
          artistGenreMap[artist.id].split(', ').forEach(genre => {
            if (genre.trim()) {
              allGenres.add(genre.trim())
            }
          })
        }
      })

      // Convert Set back to comma-separated string
      if (allGenres.size > 0) {
        trackGenreMap[item.track.id] = [...allGenres].join(', ')
      }
    }
  })

  return trackGenreMap
}

// async function getTrackGenres(tracks) {
//   const newConnection = require('../db/connection');
//   const con = newConnection();
//
//   return new Promise((resolve, reject) => {
//     // Get all track IDs
//     const trackIds = tracks
//       .filter(item => item.track && item.track.id)
//       .map(item => item.track.id);
//
//     if (trackIds.length === 0) {
//       resolve({});
//       return;
//     }
//
//     console.log('[DB] Fetching genres for', trackIds.length, 'tracks');
//
//     // Query to get genres for all tracks
//     const query = `SELECT TrackId, TrackGenre FROM ArtistGenre WHERE TrackId IN (${trackIds.map(() => '?').join(',')})`;
//
//     con.query(query, trackIds, function(err, results) {
//       con.end();
//
//       if (err) {
//         console.error('[DB] Error fetching genres:', err.message);
//         resolve({}); // Return empty object on error, don't fail the whole request
//         return;
//       }
//
//       // Convert results to map: { trackId: "genre1, genre2, ..." }
//       const genreMap = {};
//       results.forEach(row => {
//         genreMap[row.TrackId] = row.TrackGenre;
//       });
//
//       console.log('[DB] Genres loaded for', results.length, 'tracks');
//       resolve(genreMap);
//     });
//   });
// }

module.exports = app
