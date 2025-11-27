const newConnection = require('./connection');

async function addUser(userData) {
  const { id, display_name, images, product } = userData;
  const imageUrl = (images && images.length > 0) ? images[0].url : null;
  
  console.log('[DB] addUser - Starting for user:', display_name, '(ID:', id + ')')
  const con = newConnection();

  return new Promise((resolve, reject) => {
    con.connect((err) => {
      if (err) {
        console.error('[DB] addUser - Connection error:', err.message);
        reject(err);
        return;
      }
      
      // console.log('[DB] addUser - Connected to the database');

      let insert = `
        INSERT INTO User (UserId, UserName, ImageURL, Product) 
        VALUES (?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
          UserName = VALUES(UserName),
          ImageURL = VALUES(ImageURL),
          Product = VALUES(Product)
      `;

      con.query(insert, [id, display_name, imageUrl, product], function (err, result) {
        con.end();
        
        if (err) {
          console.error('[DB] addUser - Error inserting user:', err.message)
          reject(err);
        } else {
          // console.log('[DB] addUser - User record inserted/updated for:', display_name);
          resolve(result);
        }
      });
    });
  });
}

module.exports = { addUser };
