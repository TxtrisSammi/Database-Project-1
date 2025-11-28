// Playlist helper utilities

function parseFilterInput(input) {
  if (!input) return []
  
  const terms = []
  const regex = /"([^"]*)"|([^,]+)/g
  let match
  
  while ((match = regex.exec(input)) !== null) {
    const term = match[1] || match[2]
    if (term && term.trim()) {
      const trimmed = term.trim().toLowerCase()
      terms.push({
        value: trimmed,
        exact: !!match[1]
      })
    }
  }
  
  return terms
}

async function searchTracks(filters) {
  const newConnection = require('../db/connection')
  const con = newConnection()
  
  return new Promise((resolve, reject) => {
    let whereClauses = []
    let havingClauses = []
    let params = []
    
    // Build WHERE and HAVING clauses based on filters
    
    // Album filter (direct on Track table)
    if (filters.album && filters.album.trim()) {
      const albumTerms = parseFilterInput(filters.album)
      if (albumTerms.length > 0) {
        const albumConditions = albumTerms.map(term => {
          if (term.exact) {
            params.push(term.value)
            return 't.Album = ?'
          } else {
            params.push(`%${term.value}%`)
            return 't.Album LIKE ?'
          }
        })
        whereClauses.push(`(${albumConditions.join(' OR ')})`)
      }
    }
    
    // Track name filter (direct on Track table)
    if (filters.trackName && filters.trackName.trim()) {
      const trackTerms = parseFilterInput(filters.trackName)
      if (trackTerms.length > 0) {
        const trackConditions = trackTerms.map(term => {
          if (term.exact) {
            params.push(term.value)
            return 't.TrackName = ?'
          } else {
            params.push(`%${term.value}%`)
            return 't.TrackName LIKE ?'
          }
        })
        whereClauses.push(`(${trackConditions.join(' OR ')})`)
      }
    }
    
    // Artist filter (on aggregated data)
    if (filters.artist && filters.artist.trim()) {
      const artistTerms = parseFilterInput(filters.artist)
      if (artistTerms.length > 0) {
        const artistConditions = artistTerms.map(term => {
          if (term.exact) {
            params.push(`%${term.value}%`)
            return 'Artists LIKE ?'
          } else {
            params.push(`%${term.value}%`)
            return 'Artists LIKE ?'
          }
        })
        havingClauses.push(`(${artistConditions.join(' OR ')})`)
      }
    }
    
    // Genre filter (on aggregated data)
    if (filters.genre && filters.genre.trim()) {
      const genreTerms = parseFilterInput(filters.genre)
      if (genreTerms.length > 0) {
        const genreConditions = genreTerms.map(term => {
          if (term.exact) {
            params.push(`%${term.value}%`)
            return 'Genres LIKE ?'
          } else {
            params.push(`%${term.value}%`)
            return 'Genres LIKE ?'
          }
        })
        havingClauses.push(`(${genreConditions.join(' OR ')})`)
      }
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''
    const havingClause = havingClauses.length > 0 ? 'HAVING ' + havingClauses.join(' AND ') : ''
    
    const query = `
      SELECT DISTINCT 
        t.TrackId,
        t.TrackName,
        t.Album,
        t.AlbumImageURL,
        t.DurationMs,
        GROUP_CONCAT(DISTINCT a.ArtistName SEPARATOR ', ') as Artists,
        GROUP_CONCAT(DISTINCT a.ArtistId SEPARATOR ',') as ArtistIds,
        GROUP_CONCAT(DISTINCT ag.TrackGenre SEPARATOR ', ') as Genres
      FROM Track t
      LEFT JOIN TrackArtist ta ON t.TrackId = ta.TrackId
      LEFT JOIN Artist a ON ta.ArtistId = a.ArtistId
      LEFT JOIN ArtistGenre ag ON t.TrackId = ag.TrackId
      ${whereClause}
      GROUP BY t.TrackId, t.TrackName, t.Album, t.AlbumImageURL, t.DurationMs
      ${havingClause}
      ORDER BY t.TrackName
    `
    
    console.log('[PLAYLIST] Search query:', query)
    console.log('[PLAYLIST] Search params:', params)
    
    con.query(query, params, (err, results) => {
      con.end()
      if (err) {
        console.error('[PLAYLIST] Error searching tracks:', err.message)
        reject(err)
      } else {
        console.log('[PLAYLIST] Found', results.length, 'matching tracks')
        resolve(results)
      }
    })
  })
}

function generateLocalPlaylistId() {
  const uuid = require('crypto').randomUUID().substring(0, 8)
  const timestamp = Date.now()
  return `local_${uuid}_${timestamp}`
}

module.exports = {
  parseFilterInput,
  searchTracks,
  generateLocalPlaylistId
}
