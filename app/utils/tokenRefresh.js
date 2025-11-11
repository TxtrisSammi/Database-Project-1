// utility functions for handling spotify token refresh

async function refreshAccessToken(refreshToken) {
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
    throw new Error(`Failed to refresh token: ${response.status}`)
  }

  const data = await response.json()
  return data.access_token
}

async function ensureValidToken(req) {
  let token = req.session.authToken
  
  // if we have a refresh token and access token expired, refresh it
  if (!token && req.session.refreshToken) {
    try {
      token = await refreshAccessToken(req.session.refreshToken)
      req.session.authToken = token
    } catch (error) {
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

