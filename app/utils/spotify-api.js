// Spotify API utility functions

async function getPlaylistInfo(accessToken, id) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })

  if (!response.ok) {
    console.error('[API] Failed to fetch playlist - Status:', response.status)
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Token expired or invalid: ${response.status}`)
    }
    throw new Error(`Failed to fetch playlist: ${response.status}`)
  }

  const data = await response.json()

  if (!data || !data.id) {
    console.error('[API] Invalid playlist data received')
    throw new Error("Invalid playlist data received")
  }

  return data
}

async function getTracks(accessToken, id) {
  let tracks = []
  let url = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`
  let page = 1

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    })

    if (!response.ok) {
      console.error('[API] Failed to fetch tracks - Status:', response.status)
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token expired or invalid: ${response.status}`)
      }
      throw new Error(`Failed to fetch tracks: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data.items)) {
      console.error('[API] Invalid tracks data received')
      throw new Error("Invalid tracks data received")
    }

    tracks = tracks.concat(data.items)
    url = data.next
    page++
  }

  console.log('[API] Total tracks fetched:', tracks.length)
  return tracks
}

async function fetchGenresForTracks(tracks, token) {
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

  if (uniqueArtistIds.length === 0) {
    return {}
  }

  // Fetch artists in batches of 50 (Spotify API limit)
  const artistGenreMap = {}

  for (let i = 0; i < uniqueArtistIds.length; i += 50) {
    const batch = uniqueArtistIds.slice(i, i + 50)
    const url = `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`

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

async function createPlaylistInSpotify(localPlaylistId, token, con) {
  // Get playlist details from database
  const playlist = await new Promise((resolve, reject) => {
    con.query('SELECT * FROM Playlist WHERE PlaylistId = ?', [localPlaylistId], (err, results) => {
      if (err) reject(err)
      else resolve(results[0])
    })
  })

  if (!playlist) {
    throw new Error('Local playlist not found')
  }

  const userId = playlist.UserId

  // Create playlist in Spotify
  const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: playlist.PlaylistName,
      description: playlist.PlaylistDescription || '',
      public: false
    })
  })

  if (!createResponse.ok) {
    throw new Error(`Failed to create playlist in Spotify: ${createResponse.status}`)
  }

  const newPlaylist = await createResponse.json()
  console.log('[PLAYLIST] Created playlist in Spotify:', newPlaylist.id)

  // Get tracks from local playlist
  const tracks = await new Promise((resolve, reject) => {
    con.query('SELECT TrackId FROM PlaylistTrack WHERE PlaylistId = ?', [localPlaylistId], (err, results) => {
      if (err) reject(err)
      else resolve(results)
    })
  })

  // Add tracks to Spotify playlist (in batches of 100)
  if (tracks.length > 0) {
    const trackUris = tracks.map(t => `spotify:track:${t.TrackId}`)
    
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100)
      
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: batch
        })
      })

      if (!addTracksResponse.ok) {
        console.error('[PLAYLIST] Failed to add tracks batch to Spotify playlist')
      }
    }
  }

  return newPlaylist.id
}

module.exports = {
  getPlaylistInfo,
  getTracks,
  fetchGenresForTracks,
  createPlaylistInSpotify
}
