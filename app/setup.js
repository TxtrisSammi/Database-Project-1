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
  "PendingChanges",
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

    // Check emoji support
    console.log("\n=== Checking Database Character Set ===");
    emojiFix(con);
    // Wait a moment for the check to complete
    await new Promise(resolve => setTimeout(resolve, 500));

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
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  const createTrack = `
    CREATE TABLE IF NOT EXISTS Track (
      TrackId VARCHAR(255) PRIMARY KEY,
      TrackName VARCHAR(255),
      Album VARCHAR(255),
      AlbumImageURL VARCHAR(500),
      DurationMs INT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  const createArtist = `
    CREATE TABLE IF NOT EXISTS Artist (
      ArtistId VARCHAR(255) PRIMARY KEY,
      ArtistName VARCHAR(255)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  const createArtistGenre = `
    CREATE TABLE IF NOT EXISTS ArtistGenre (
      TrackId VARCHAR(255),
      TrackGenre VARCHAR(255),
      PRIMARY KEY (TrackId, TrackGenre),
      FOREIGN KEY (TrackId) REFERENCES Track(TrackId)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  const createTrackGenre = `
    CREATE TABLE IF NOT EXISTS TrackGenre (
      ArtistId VARCHAR(255),
      ArtistGenre VARCHAR(255),
      PRIMARY KEY (ArtistId, ArtistGenre),
      FOREIGN KEY (ArtistId) REFERENCES Artist(ArtistId)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  const createPendingChanges = `
    CREATE TABLE IF NOT EXISTS PendingChanges (
      ChangeId INT AUTO_INCREMENT PRIMARY KEY,
      PlaylistId VARCHAR(255),
      TrackId VARCHAR(255) NULL,
      ChangeType ENUM('REMOVE_TRACK', 'DELETE_PLAYLIST') DEFAULT 'REMOVE_TRACK',
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  const createTrigger = `
    CREATE TRIGGER IF NOT EXISTS after_playlisttrack_delete
    AFTER DELETE ON PlaylistTrack
    FOR EACH ROW
    BEGIN
      INSERT INTO PendingChanges (PlaylistId, TrackId, ChangeType)
      VALUES (OLD.PlaylistId, OLD.TrackId, 'REMOVE_TRACK');
    END;
  `;

  const queries = [
    createUser,
    createTrack,
    createArtist,
    createArtistGenre,
    createTrackGenre,
    createTrackArtist,
    createPlaylist,
    createPlaylistTrack,
    createPendingChanges
  ];

  for (const sql of queries) {
    await query(sql);
  }

  // Create trigger separately
  try {
    await query("DROP TRIGGER IF EXISTS after_playlisttrack_delete");
    await query(createTrigger);
    console.log("✓ Trigger created successfully");
  } catch (err) {
    console.log("⚠ Trigger creation:", err.message);
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

function emojiFix(con) {
  // uncomment if emoji's are causing issues
  // let x = `
  //   ALTER DATABASE ${process.env.DB} 
  //   CHARACTER SET utf8mb4 
  //   COLLATE utf8mb4_unicode_ci
  //   ;
  //   `
  // con.query(x)


  // checks charsets 
  // (make sure client, connection, and database are utf8mb4 NOT utf8mb3 
  // if you want emojis to work)
  let y = `
  SHOW VARIABLES 
  WHERE Variable_name 
  LIKE 'character\_set\_%' 
  OR Variable_name 
  LIKE 'collation%'
  ;
  `

  con.query(y, (err, res) => {
    if (err) {
      console.error("Error checking character set:", err.message);
    } else {
      console.log("\nDatabase Character Set Configuration:");
      res.forEach(row => {
        console.log(`  ${row.Variable_name}: ${row.Value}`);
      });
      console.log("");
    }
  })
}

