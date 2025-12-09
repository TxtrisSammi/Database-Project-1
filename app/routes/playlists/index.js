const express = require("express")
const app = express.Router()
const { ensureValidToken } = require("../../utils/tokenRefresh")
const { validatePlaylistId } = require("../../middleware/validateInput")
const { addTracks } = require("../../db/add-tracks")
const { getPlaylistTracks, getTrackGenres } = require("../../db/get-tracks")
const { getPlaylists } = require("../../db/get-playlists")
const newConnection = require('../../db/connection')
const { getTopGenre, getTopArtist, getGenreStats } = require("../../db/get-playlist-stats")

const {
  getPlaylistInfo,
  getTracks,
  fetchGenresForTracks,
  createPlaylistInSpotify
} = require('../../utils/spotify-api')

app.get("/playlists/:id", validatePlaylistId, async (req, res, next) => {
  let id = req.params.id
  console.log('[PLAYLIST] /playlists/' + id + ' - Loading playlist from database')

  try {
    // Load playlist info from database
    const { getPlaylists } = require("../../db/get-playlists")
    const playlists = await getPlaylists(req.session.userId || '')
    const playlistData = playlists.find(p => p.PlaylistId === id)

    let playlist = null
    if (playlistData) {
      playlist = {
        id: playlistData.PlaylistId,
        name: playlistData.PlaylistName,
        description: playlistData.PlaylistDescription,
        images: playlistData.ImageURL ? [{ url: playlistData.ImageURL }] : [],
        owner: { display_name: 'You' }
      }
    }

    

    // Load tracks from database
    let dbTracks = await getPlaylistTracks(id)
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

    let top_genre = await getTopGenre(playlistData.PlaylistId)
    let genre_stats = await getGenreStats(playlistData.PlaylistId)
    let top_artist = await getTopArtist(playlistData.PlaylistId)

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

    console.log('[PLAYLIST] Rendering playlist page with DB data')
    console.log('[PLAYLIST] Playlist:', playlist ? playlist.name : 'No data')
    console.log('[PLAYLIST] Tracks:', tracks.length)
    res.render("playlist.ejs", {
      playlist: playlist,
      tracks: tracks,
      genres: genres,
      userId: req.session.userId || '',
      top_genre: top_genre, 
      genre_stats: genre_stats, 
      top_artist: top_artist 

    })

  } catch (error) {
    console.error('[PLAYLIST] Error in /playlists/:id route:', error.message)
    next(error)
  }
})

app.post("/playlists/:id/refresh", validatePlaylistId, async (req, res, next) => {
  let id = req.params.id
  console.log('[PLAYLIST] /playlists/' + id + '/refresh - Fetching from Spotify')

  try {
    let token = await ensureValidToken(req)

    if (!token) {
      console.log('[PLAYLIST] No valid token, redirecting to /auth')
      return res.redirect("/auth")
    }

    // First, process pending changes
    console.log('[PLAYLIST] Checking for pending changes...')
    const result = await processPendingChanges(id, token)

    // If playlist was created in Spotify, redirect to home so user can refresh
    if (result && result.redirectToHome) {
      console.log('[PLAYLIST] Playlist created in Spotify, redirecting to home')
      return res.redirect('/user')
    }

    let playlist = await getPlaylistInfo(token, id)
    let tracks = await getTracks(token, id)
    let genres = await fetchGenresForTracks(tracks, token)

    await addTracks(tracks, id, token)

    console.log('[PLAYLIST] Redirecting back to playlist')
    res.redirect('/playlists/' + id)

  } catch (error) {
    console.error('[PLAYLIST] Error in /playlists/:id/refresh route:', error.message)
    next(error)
  }
})

async function processPendingChanges(playlistId, token) {
  const con = newConnection()

  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM PendingChanges WHERE PlaylistId = ? AND ChangeType IN ('REMOVE_TRACK', 'CREATE_PLAYLIST')"

    con.query(query, [playlistId], async (err, results) => {
      if (err) {
        con.end()
        console.error('[PLAYLIST] Error fetching pending changes:', err.message)
        reject(err)
        return
      }

      if (results.length === 0) {
        con.end()
        console.log('[PLAYLIST] No pending changes found')
        resolve()
        return
      }

      console.log('[PLAYLIST] Found', results.length, 'pending changes')

      // Check if we need to create the playlist in Spotify first
      const createPlaylistChange = results.find(c => c.ChangeType === 'CREATE_PLAYLIST')

      if (createPlaylistChange) {
        try {
          console.log('[PLAYLIST] Creating playlist in Spotify for local playlist:', playlistId)
          const newSpotifyId = await createPlaylistInSpotify(playlistId, token, con)

          if (newSpotifyId) {
            console.log('[PLAYLIST] Successfully created in Spotify with ID:', newSpotifyId)

            // Delete the local playlist and pending change
            await new Promise((resolve2, reject2) => {
              con.query('DELETE FROM PendingChanges WHERE ChangeId = ?', [createPlaylistChange.ChangeId], (err2) => {
                if (err2) reject2(err2)
                else resolve2()
              })
            })

            // Delete the local playlist
            await new Promise((resolve2, reject2) => {
              con.query('DELETE FROM Playlist WHERE PlaylistId = ?', [playlistId], (err2) => {
                if (err2) reject2(err2)
                else resolve2()
              })
            })

            con.end()
            console.log('[PLAYLIST] Local playlist deleted, user should refresh to see Spotify version')
            resolve({ redirectToHome: true })
            return
          }
        } catch (error) {
          console.error('[PLAYLIST] Error creating playlist in Spotify:', error.message)
          con.end()
          reject(error)
          return
        }
      }

      // Process track removals
      const trackRemovals = results.filter(c => c.ChangeType === 'REMOVE_TRACK')

      for (const change of trackRemovals) {
        try {
          console.log('[PLAYLIST] Removing track', change.TrackId, 'from Spotify playlist')

          const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tracks: [
                { uri: `spotify:track:${change.TrackId}` }
              ]
            })
          })

          if (response.ok) {
            await new Promise((resolve2, reject2) => {
              con.query('DELETE FROM PendingChanges WHERE ChangeId = ?', [change.ChangeId], (err2) => {
                if (err2) reject2(err2)
                else resolve2()
              })
            })
          } else {
            console.error('[PLAYLIST] Failed to remove track from Spotify:', response.status)
          }
        } catch (error) {
          console.error('[PLAYLIST] Error processing pending change:', error.message)
        }
      }

      con.end()
      console.log('[PLAYLIST] Finished processing pending changes')
      resolve()
    })
  })
}

module.exports = app
