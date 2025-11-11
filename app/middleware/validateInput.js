// input validation middleware

function validatePlaylistId(req, res, next) {
  const id = req.params.id
  
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).redirect("/user")
  }
  
  // spotify ids are typically 22 characters alphanumeric
  if (id.length > 30 || !/^[a-zA-Z0-9]+$/.test(id)) {
    return res.status(400).redirect("/user")
  }
  
  next()
}

module.exports = {
  validatePlaylistId
}

