// error handling middleware

function errorHandler(err, req, res, next) {
  console.error("Error:", err)

  // handle spotify api errors
  if (err.message && (err.message.includes("Token expired") || err.message.includes("401") || err.message.includes("403"))) {
    // token expired or invalid
    req.session.authToken = null
    req.session.refreshToken = null
    return res.redirect("/auth")
  }
  
  if (err.message && err.message.includes("404")) {
    // resource not found, redirect to user page
    return res.redirect("/user")
  }

  // default error response - redirect to user page or home
  if (req.session && req.session.authToken) {
    res.redirect("/user")
  } else {
    res.redirect("/")
  }
}

module.exports = errorHandler

