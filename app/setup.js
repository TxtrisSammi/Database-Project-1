// imports
require("dotenv").config(); // allow reading from .env
const mysql = require("mysql");

// setup db connection
let con = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASS,
  database: process.env.DB,
  port: process.env.PORT || 3306,
  multipleStatements: true
});


let tables = [
  "User",
  "Track",
  "Artist",
  "ArtistGenre",
  "TrackGenre",
  "TrackArtist",
  "Playlist",
  "PlaylistTrack"
]

// connect and perform queries
con.connect(function (err) {
  if (err) throw err; // if theres an error connecting, throw error
  console.log("connected");

  // drop all for sake of debugging
  dropAll(con, tables)

  // create tables
  createAll(con)

  // etc
  selectAll(con, tables)
})

function createAll(con) {
  let createUser = `
    create table User
    (userId varchar(30) primary key, username varchar(50)
    );
    `

  let createTrack = `
    create table Track (
        Trackid varchar(30) primary key,
        TrackName varchar(255),
        Album varchar(255)
    );
    `

  let createArtist = `
    create table Artist (
        ArtistId varchar(30) primary key,
        ArtistName varchar(255)
    );
    `

  let createArtistGenre = `
    create table ArtistGenre (
        TrackId varchar(30),
        TrackGenre varchar(255),
        primary key (TrackId, TrackGenre),
        foreign key (TrackId) references Track(Trackid)
            on update cascade on delete cascade
    );
    `

  let createTrackGenre = `
    create table TrackGenre (
        ArtistId varchar(30),
        ArtistGenre varchar(255),
        primary key (ArtistId, ArtistGenre),
        foreign key (ArtistId) references Artist(ArtistId)
            on update cascade on delete cascade
    );
    `

  let createTrackArtist = `
    create table TrackArtist (
        Trackid varchar(30),
        ArtistId varchar(30),
        primary key (Trackid, ArtistId),
        foreign key (Trackid) references Track(Trackid)
            on update cascade on delete cascade,
        foreign key (ArtistId) references Artist(ArtistId)
            on update cascade on delete cascade
    );
    `

  let createPlaylist = `
    create table Playlist (
        PlaylistId varchar(30) primary key,
        PlaylistName varchar(255),
        PlaylistDescription varchar(255),
        UserId varchar(30),
        foreign key (UserId) references User(userId)
            on update cascade on delete cascade
    );
    `

  let createPlaylistTrack = `
    create table PlaylistTrack (
        TrackId varchar(30),
        PlaylistId varchar(30),
        primary key (TrackId, PlaylistId),
        foreign key (TrackId) references Track(Trackid)
            on update cascade on delete cascade,
        foreign key (PlaylistId) references Playlist(PlaylistId)
            on update cascade on delete cascade
    );
    `

  let emojiFix = `
  ALTER DATABASE ${process.env.DB} 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci
  ;
  `

  let queries = [
    createUser,
    createTrack,
    createArtist,
    createArtistGenre,
    createTrackGenre,
    createTrackArtist,
    createPlaylist,
    createPlaylistTrack,
    emojiFix
  ]

  let createAll = ""

  for (const query of queries) {
    createAll += query
  }

  con.query(createAll, (err) => {
    if (err) throw err
    console.log("tables succesfully created");
  })
}

function dropAll(con, tables) {

  let tablesString = tables.join(", ")

  let dropAll = "drop table " + tablesString

  con.query(dropAll, (err) => {
    if (err) throw err
    console.log("tables succesfully dropped");
  })
}

function selectAll(con, tables) {
  for (const table of tables) {
    let select = "select * from " + table
    con.query(select, (err, res) => {
      console.log("selecting " + table)
      console.log(res)
    })
  }
}

