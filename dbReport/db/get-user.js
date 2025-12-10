const newConnection = require('./connection');

async function getUser(userId) {
  console.log('[DB] getUser - Fetching user:', userId);
  const con = newConnection();

  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM User WHERE UserId = ?';
    
    con.query(query, [userId], function(err, results) {
      con.end();
      
      if (err) {
        console.error('[DB] getUser - Error:', err.message);
        reject(err);
        return;
      }
      
      if (results.length === 0) {
        console.log('[DB] getUser - No user found');
        resolve(null);
        return;
      }
      
      console.log('[DB] getUser - User found:', results[0].Username);
      resolve(results[0]);
    });
  });
}

module.exports = { getUser };
