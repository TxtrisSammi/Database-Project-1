const newConnection = require('./connection');

async function addUser(id, name) {
  console.log('[DB] addUser - Starting for user:', name, '(ID:', id + ')')
  const con = newConnection();

  try {
    con.connect();
    console.log('[DB] addUser - Connected to the database');

    let insert = `INSERT INTO User (UserId, UserName) VALUES (?, ?) ON DUPLICATE KEY UPDATE UserName = VALUES(UserName)`;

    con.query(insert, [id, name], function (err, result) {
      if (err) {
        console.error('[DB] addUser - Error inserting user:', err.message)
        throw err;
      }
      console.log('[DB] addUser - User record inserted/updated for:', name);
    });
  } catch (error) {
    console.error('[DB] addUser - Error while interacting with the database:', error.message);
  } finally {
    con.end((endErr) => {
      if (endErr) {
        console.error('[DB] addUser - Error while closing the database connection:', endErr.message);
      } else {
        console.log('[DB] addUser - Connection closed gracefully');
      }
    });
  }
}

module.exports = { addUser };
