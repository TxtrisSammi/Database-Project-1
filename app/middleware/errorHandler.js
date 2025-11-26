// error handling middleware

function errorHandler(err, req, res, next) {
  console.error('\n[ERROR HANDLER] Error caught:', err.message)
  console.error('[ERROR HANDLER] Stack:', err.stack)

  // handle spotify api errors
  if (err.message && (err.message.includes("Token expired") || err.message.includes("401") || err.message.includes("403"))) {
    console.log('[ERROR HANDLER] Token-related error detected, clearing session and redirecting to /auth')
    // token expired or invalid
    req.session.authToken = null
    req.session.refreshToken = null
    return res.redirect("/auth")
  }
  
  if (err.message && err.message.includes("404")) {
    console.log('[ERROR HANDLER] 404 error detected, redirecting to /user')
    // resource not found, redirect to user page
    return res.redirect("/user")
  }

  // default error response - redirect to user page or home
  if (req.session && req.session.authToken) {
    console.log('[ERROR HANDLER] Redirecting to /user (has auth token)')
    res.redirect("/user")
  } else {
    console.log('[ERROR HANDLER] Redirecting to / (no auth token)')
    res.redirect("/")
  }
}

module.exports = errorHandler

