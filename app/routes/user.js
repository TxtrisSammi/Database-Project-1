const { stringify } = require("querystring");
const express = require("express")
const app = express.Router()

app.get("/user", async (req, res) => {

  let token = req.session.authToken

  if (token) {
    let data = await getProfile(token)
    // display_name
    // external_urls: spotify
    // images: 0: url // large image
    //         1: url // small
    // product

    res.render("user.ejs", { data: data })
    // res.send(data)
  } else {
    res.redirect("/auth")
  }

})

async function getProfile(accessToken) {
  // send user data request with token
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })

  // wait for it to come in and return it from the function
  const data = await response.json()
  return data
}

module.exports = app
