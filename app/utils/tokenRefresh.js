// utility functions for handling spotify token refresh

async function refreshAccessToken(refreshToken) {
  console.log('[TOKEN] Attempting to refresh access token')
  const authOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(process.env.ID + ":" + process.env.SECRET).toString("base64")
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  }

  const response = await fetch("https://accounts.spotify.com/api/token", authOptions)
  
  if (!response.ok) {
    console.error('[TOKEN] Failed to refresh token - Status:', response.status)
    const errorBody = await response.text()
    console.error('[TOKEN] Error response body:', errorBody)
    throw new Error(`Failed to refresh token: ${response.status}`)
  }

  const data = await response.json()
  console.log('[TOKEN] Access token refreshed successfully')
  console.log('[TOKEN] New token preview:', data.access_token ? data.access_token.substring(0, 20) + '...' : 'none')
  return data.access_token
}

async function ensureValidToken(req) {
  let token = req.session.authToken
  
  console.log('[TOKEN] ensureValidToken - token exists:', !!token, 'refresh token exists:', !!req.session.refreshToken)
  
  // if we have a refresh token and access token expired, refresh it
  if (!token && req.session.refreshToken) {
    console.log('[TOKEN] Attempting to refresh token...')
    try {
      token = await refreshAccessToken(req.session.refreshToken)
      req.session.authToken = token
      console.log('[TOKEN] Token refreshed successfully')
    } catch (error) {
      console.error('[TOKEN] Token refresh failed:', error.message)
      // if refresh fails, clear session
      req.session.authToken = null
      req.session.refreshToken = null
      throw error
    }
  }
  
  return token
}

module.exports = {
  refreshAccessToken,
  ensureValidToken
}

