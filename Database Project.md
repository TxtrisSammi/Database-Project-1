<!-- markdownlint-disable MD033 -->

# Project plan

## [Scriveners](https://www.oed.com/dictionary/scrivener_n)

* [Caleb Wiyninger](https://github.com/crw405)
* [Samantha Morales](https://github.com/TxtrisSammi)

## Project idea

Spotify song manager.

## Description

User connects and the program gets the users liked songs (or another playlist) and converts the JSON into SQL which can be queried in order to sort the songs into different playlists.

## Developing environment

* OS:
  * Windows 11
  * Linux
* IDE:
  * VSCode
* Database:
  * MySQL / MariaDB
  * MySQL Workbench
* Language:
  * Backend:
    * Node.js
  * Frontend:
    * HTML
    * CSS
    * JS

## Initial design

### User

| Attribute<br>/ Domain name | UserId                       | UserName             |
| -------------------------- | ---------------------------- | -------------------- |
| Meaning                    | Spotify ID of the user       | Username of the user |
| Domain<br>Definition       | Char: Size 22<br>Primary Key | Char: Size 100       |

### Track

| Attribute<br>/ Domain name | Trackid                      | TrackName         | Album             |
| -------------------------- | ---------------------------- | ----------------- | ----------------- |
| Meaning<br>                | Spotify ID of a the track    | Name of the track | Name of the album |
| Domain<br>Definition       | Char: Size 22<br>Primary Key | Char: Size 100    | Char: Size 100    |

### Artist

| Attribute<br>/ Domain name | ArtistId                     | ArtistName         |
| -------------------------- | ---------------------------- | ------------------ |
| Meaning                    | Spotify ID of the artist     | Name of the artist |
| Domain<br>Definition       | Char: Size 22<br>Primary Key | Char: Size 100     |

### ArtistGenre

| Attribute<br>/ Domain name | TrackId                                       | TrackGenre                      |
| -------------------------- | --------------------------------------------- | ------------------------------- |
| Meaning                    | Spotify ID of the track                       | Name of the genre               |
| Domain<br>Definition       | Char: Size 22<br>Composite Key<br>Foreign Key | Char: Size 100<br>Composite Key |

### TrackGenre

| Attribute<br>/ Domain name | ArtistId                                      | ArtistGenre                     |
| -------------------------- | --------------------------------------------- | ------------------------------- |
| Meaning                    | Spotify ID of the artist                      | Name of the genre               |
| Domain<br>Definition       | Char: Size 22<br>Composite Key<br>Foreign Key | Char: Size 100<br>Composite Key |

### TrackArtist

| Attribute<br>/ Domain name | Trackid                                       | ArtistId                                      |
| -------------------------- | --------------------------------------------- | --------------------------------------------- |
| Meaning                    | Spotify ID of the track                       | Spotify ID of the artist                      |
| Domain<br>Definition       | Char: Size 22<br>Composite Key<br>Foreign Key | Char: Size 22<br>Composite Key<br>Foreign Key |

### Playlist

| Attribute<br>/ Domain name | PlaylistId                     | PlaylistName         | PlaylistDescription         | UserId                       |
| -------------------------- | ------------------------------ | -------------------- | --------------------------- | ---------------------------- |
| Meaning<br>                | Spotify ID of the playlist<br> | Name of the playlist | Description of the playlist | Spotify ID of the user<br>   |
| Domain<br>Definition       | Char: Size 22<br>Primary key   | Char: Size 22<br>    | Char: Size 100              | Char: Size 22<br>Foreign Key |

### PlaylistTrack

| Attribute<br>/ Domain name | TrackId                                       | PlaylistId                                    |
| -------------------------- | --------------------------------------------- | --------------------------------------------- |
| Meaning<br>                | Spotify ID of the track<br>                   | Spotify ID of the playlist<br>                |
| Domain<br>Definition       | Char: Size 22<br>Composite Key<br>Foreign Key | Char: Size 22<br>Composite Key<br>Foreign Key |

## Data source

User, Spotify API
