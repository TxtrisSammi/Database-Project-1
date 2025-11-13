const newConnection = require('./connection');

async function addUser(id, name) {
  const con = newConnection();

  try {
    con.connect();
    console.log('Connected to the database!');

    let insert = `INSERT INTO User (UserId, UserName) VALUES (?, ?) ON DUPLICATE KEY UPDATE UserName = VALUES(UserName)`;

    con.query(insert, [id, name], function (err, result) {
      if (err) {
        throw err;
      }
      console.log("1 record inserted");
    });
  } catch (error) {
    console.error('Error while interacting with the database:', error);
  } finally {
    con.end((endErr) => {
      if (endErr) {
        console.error('Error while closing the database connection:', endErr);
      } else {
        console.log('Connection closed gracefully.');
      }
    });
  }
}

module.exports = { addUser };
