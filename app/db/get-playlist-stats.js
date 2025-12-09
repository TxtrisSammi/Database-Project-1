const newConnection = require('./connection');

async function getGenreStats(playlistId) {
    console.log('[DB] getGenreStats');
    const con = newConnection();

    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            TRIM(j.genre) AS SingleGenre,
            COUNT(*) AS GenreCount
        FROM
            PlaylistTrack
        JOIN
            TrackArtist ON PlaylistTrack.TrackId = TrackArtist.TrackId
        JOIN
            TrackGenre tg ON TrackArtist.ArtistId = tg.ArtistId
        JOIN
            JSON_TABLE(
                COALESCE(
                    CONCAT('["', REPLACE(tg.ArtistGenre, ',', '","'), '"]'),
                    '[]' 
                ),
                '$[*]' COLUMNS (genre VARCHAR(255) PATH '$')
            ) AS j
        WHERE
            PlaylistTrack.PlaylistId = ?
        GROUP BY
            SingleGenre
        ORDER BY
            GenreCount DESC;
    `;

        con.query(query, playlistId, function (err, results) {
            con.end();

            if (err) {
                console.error('[DB] getPLAYLISTGenreStats - Error:', err.message);
                reject(err);
                return;
            }

            console.log('[DB] getPLAYLISTGenreStats - Found', results);
            resolve(results);
        });
    })
}

async function getTopGenre(playlistId) {
    console.log('[DB] getTopGenre');
    const con = newConnection();

    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            TRIM(j.genre) AS SingleGenre,
            COUNT(*) AS GenreCount
        FROM
            PlaylistTrack PT
        JOIN
            TrackArtist TA ON PT.TrackId = TA.TrackId
        JOIN
            TrackGenre TG ON TA.ArtistId = TG.ArtistId
        JOIN
            JSON_TABLE(
                COALESCE(
                    CONCAT('["', REPLACE(TG.ArtistGenre, ',', '","'), '"]'),
                    '[]' 
                ),
                '$[*]' COLUMNS (genre VARCHAR(255) PATH '$')
            ) AS j
        WHERE
            PT.PlaylistId = ? AND
            genre != ' '
        GROUP BY
            SingleGenre
        ORDER BY
            GenreCount DESC
        LIMIT 1;
    `;

        con.query(query, playlistId, function (err, results) {
            con.end();

            if (err) {
                console.error('[DB] getPLAYLISTTopGenre - Error:', err.message);
                reject(err);
                return;
            }

            console.log('[DB] getPLAYLISTTopGenre - Found Top Genre', results);
            resolve(results[0]);
        });
    })
}

async function getTopArtist(playlistId) {
    console.log('[DB] getTopArtist');
    const con = newConnection();

    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            A.ArtistName,
            COUNT(PT.TrackId) AS ArtistCount
        FROM
            PlaylistTrack PT
        JOIN
            TrackArtist TA ON PT.TrackId = TA.TrackId
        JOIN
            Artist A ON TA.ArtistId = A.ArtistId
        WHERE
            PT.PlaylistId = ?
        GROUP BY
            A.ArtistName
        ORDER BY
            ArtistCount DESC
        LIMIT 1;
    `;

        con.query(query, playlistId, function (err, results) {
            con.end();

            if (err) {
                console.error('[DB] getPLAYLISTTopArtist - Error:', err.message);
                reject(err);
                return;
            }

            console.log('[DB] getPLAYLISTTopArtist - Found Top Artist', results);
            resolve(results[0]);
        });
    })
}

module.exports = { getGenreStats, getTopGenre, getTopArtist };