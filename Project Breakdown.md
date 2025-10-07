# Project Breakdown

## Features

- Log in with spotify account
- Get user playlists
- get songs in a playlist
- sort a playlist by:
  - Artists
  - Genres
- Create a new playlist
- Stats
- Edit track traits/info
- Add and edit per track genres

## Tasks

Week 1 - 5 | 08/26 - 9/25

### Week 6 - 7 | 9/30 - 10/09

- Learn Node.js, Express, CSS
- Learn MySQL

### Week 8 | 10/14 - 10/16

- Setting uo an node/express app
- setting up db

### Week 9 - 10 | 10/21 - 10/30

- set up front end:
  - created all pages/routes
  - styling
  - ui
- Setting up api calls:
  - Auth
  - Get user
  - Get playlists
  - Get tracks

### Week 11 - 12 | 11/04 - 11/13

- Setting db actions/queries:
  - adding user
  - adding playlists
  - adding tracks
  - adding artists
  - adding genres
  - editing genres

### Week 13 | 11/18 - 1/20

- Sorting:
  - By artists
  - By genres
- Stats

### Week 14 | 11/25 - 11/27

- UI functionality:
  - displaying info
  - buttons function

### Week 15 | 12/02 - 12/04

- Finalization
- Presentation preparation

## Queries

- SELECT *FROM User WHERE UserId = id; -- get user info
- SELECT TrackID FROM PlaylistTrack WHERE PlaylistId = id; -- get all songs from playlist
- SELECT PlaylistId FROM Playlist WHERE UserId = id; -- get all playlist that user has
- SELECT* FROM Track WHERE TrackId = id; -- get all track info for a track
- SELECT * FROM Artist WHERE ArtistId = id; -- get all artists for a track
- SELECT ArtistGenre FROM ArtistGenre WHERE ArtistId = id; -- get all genres for an artist

## Actions

### User

- INSERT INTO User id, name; -- insert when new user

### Track

- INSERT INTO Track id, name, album; -- insert when new track
- INSERT INTO TrackArtist track_id, artist_id; -- insert when new track

### Artist

- INSERT INTO Artist id, name; -- insert when new Artist
- INSERT INTO ArtistGenre id, genre; -- insert when new Artist

### Playlist

- INSERT INTO Playlist id, name, desc, user_id; -- insert when new playlist
- INSERT INTO PlaylistTrack track_id, playlist_id; -- insert when new playlist

### Genre

- INSERT INTO ArtistGenre id, genre; -- when editing artist genres
- DELETE FROM ArtistGenre WHERE ArtistId = id, ArtistGenre = genre; -- when editing artist genres
- INSERT INTO TrackGenre id, genre; -- when editing track genres
- DELETE FROM TrackGenre WHERE ArtistId = id, ArtistGenre = genre; -- when editing track genres
