// imports
require("dotenv").config();
const mysql = require("mysql");
const util = require("util");

// setup db connection
const con = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASS,
  database: process.env.DB,
  port: process.env.PORT || 3306,
  charset: 'utf8mb4',
  multipleStatements: true
});

// promisify query for async/await
const query = util.promisify(con.query).bind(con);

const tables = [
  "PlaylistTrack",
  "Playlist",
  "TrackArtist",
  "TrackGenre",
  "ArtistGenre",
  "Track",
  "Artist",
  "User"
];

// main execution
async function main() {
  try {
    await connectDB();

    const args = process.argv.slice(2);
    const shouldDrop = args.includes("--drop");
    const shouldVerify = args.includes("--verify");

    if (shouldDrop) {
      console.log("\n=== Dropping existing tables ===");
      await dropAll();
    }

    console.log("\n=== Creating tables ===");
    await createAll();

    if (shouldVerify) {
      console.log("\n=== Verifying tables ===");
      await verifyTables();
    }

    console.log("\n✓ Database setup completed successfully");

  } catch (err) {
    console.error("✗ Setup failed:", err.message);
    process.exit(1);
  } finally {
    con.end();
  }
}

function connectDB() {
  return new Promise((resolve, reject) => {
    con.connect((err) => {
      if (err) {
        reject(new Error(`Connection failed: ${err.message}`));
      } else {
        console.log("✓ Connected to database");
        resolve();
      }
    });
  });
}

main();

async function createAll() {
  const createUser = `
    CREATE TABLE IF NOT EXISTS User (
      UserId VARCHAR(255) PRIMARY KEY,
      Username VARCHAR(255),
      ImageURL VARCHAR(500),
      Product VARCHAR(50),
      LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  const createTrack = `
    CREATE TABLE IF NOT EXISTS Track (
      TrackId VARCHAR(255) PRIMARY KEY,
      TrackName VARCHAR(255),
      Album VARCHAR(255),
      AlbumImageURL VARCHAR(500),
      DurationMs INT
    );
  `;

  const createArtist = `
    CREATE TABLE IF NOT EXISTS Artist (
      ArtistId VARCHAR(255) PRIMARY KEY,
      ArtistName VARCHAR(255)
    );
  `;

  const createArtistGenre = `
    CREATE TABLE IF NOT EXISTS ArtistGenre (
      TrackId VARCHAR(255),
      TrackGenre VARCHAR(255),
      PRIMARY KEY (TrackId, TrackGenre),
      FOREIGN KEY (TrackId) REFERENCES Track(TrackId)
        ON UPDATE CASCADE ON DELETE CASCADE
    );
  `;

  const createTrackGenre = `
    CREATE TABLE IF NOT EXISTS TrackGenre (
      ArtistId VARCHAR(255),
      ArtistGenre VARCHAR(255),
      PRIMARY KEY (ArtistId, ArtistGenre),
      FOREIGN KEY (ArtistId) REFERENCES Artist(ArtistId)
        ON UPDATE CASCADE ON DELETE CASCADE
    );
  `;

  const createTrackArtist = `
    CREATE TABLE IF NOT EXISTS TrackArtist (
      TrackId VARCHAR(255),
      ArtistId VARCHAR(255),
      PRIMARY KEY (TrackId, ArtistId),
      FOREIGN KEY (TrackId) REFERENCES Track(TrackId)
        ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (ArtistId) REFERENCES Artist(ArtistId)
        ON UPDATE CASCADE ON DELETE CASCADE
    );
  `;

  const createPlaylist = `
    CREATE TABLE IF NOT EXISTS Playlist (
      PlaylistId VARCHAR(255) PRIMARY KEY,
      PlaylistName VARCHAR(255),
      PlaylistDescription VARCHAR(1000),
      ImageURL VARCHAR(500),
      UserId VARCHAR(255),
      LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (UserId) REFERENCES User(UserId)
        ON UPDATE CASCADE ON DELETE CASCADE
    );
  `;

  const createPlaylistTrack = `
    CREATE TABLE IF NOT EXISTS PlaylistTrack (
      TrackId VARCHAR(255),
      PlaylistId VARCHAR(255),
      PRIMARY KEY (TrackId, PlaylistId),
      FOREIGN KEY (TrackId) REFERENCES Track(TrackId)
        ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (PlaylistId) REFERENCES Playlist(PlaylistId)
        ON UPDATE CASCADE ON DELETE CASCADE
    );
  `;

  const queries = [
    createUser,
    createTrack,
    createArtist,
    createArtistGenre,
    createTrackGenre,
    createTrackArtist,
    createPlaylist,
    createPlaylistTrack
  ];

  for (const sql of queries) {
    await query(sql);
  }

  console.log("✓ All tables created successfully");
}

async function dropAll() {
  try {
    await query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of tables) {
      try {
        await query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`  - Dropped ${table}`);
      } catch (err) {
        console.warn(`  ⚠ Could not drop ${table}: ${err.message}`);
      }
    }

    await query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("✓ All tables dropped successfully");
  } catch (err) {
    throw new Error(`Failed to drop tables: ${err.message}`);
  }
}

async function verifyTables() {
  const reversedTables = [...tables].reverse();

  for (const table of reversedTables) {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✓ ${table}: ${result[0].count} rows`);
    } catch (err) {
      console.error(`  ✗ ${table}: ${err.message}`);
    }
  }
}

