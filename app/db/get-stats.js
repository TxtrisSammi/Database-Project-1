const newConnection = require('./connection');

async function getGenreStats() {
    console.log('[DB] getGenreStats');
    const con = newConnection();

    return new Promise((resolve, reject) => {
        const query = `
        SELECT * FROM GenreView
        WHERE SingleGenre != ' '; 
        `;

        con.query(query, function (err, results) {
            con.end();

            if (err) {
                console.error('[DB] getGenreStats - Error:', err.message);
                reject(err);
                return;
            }

            console.log('[DB] getGenreStats - Found', results);
            resolve(results);
        });
    })
}

async function getTopGenre() {
    console.log('[DB] getTopGenre');
    const con = newConnection();

    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            SingleGenre, 
            GenreCount 
        FROM 
            GenreView 
        WHERE 
            SingleGenre != ' '
        ORDER BY 
            GenreCount DESC
        LIMIT 1;
        `;

        con.query(query, function (err, results) {
            con.end();

            if (err) {
                console.error('[DB] getTopGenre - Error:', err.message);
                reject(err);
                return;
            }

            console.log('[DB] getTopGenre - Found Top Genre', results);
            resolve(results[0]);
        });
    })
}

async function getTopArtist() {
    console.log('[DB] getTopArtist');
    const con = newConnection();

    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            ArtistName, 
            ArtistCount 
        FROM 
            ArtistView 
        ORDER BY 
            ArtistCount DESC
        LIMIT 1;
        `;

        con.query(query, function (err, results) {
            con.end();

            if (err) {
                console.error('[DB] getTopArtist - Error:', err.message);
                reject(err);
                return;
            }

            console.log('[DB] getTopArtist - Found Top Artist', results);
            resolve(results[0]);
        });
    })
}

module.exports = { getGenreStats, getTopGenre, getTopArtist };