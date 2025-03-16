import mysql from 'mysql2';

// Create a connection pool to your MySQL database
const pool = mysql.createPool({
  host: 'srv787.hstgr.io',   // e.g. localhost or a remote MySQL server
  user: 'u208245805_Crypto21',   // Your MySQL username
  password: 'Crypto21@',  // Your MySQL password
  database: 'u208245805_Crypto21',  // Your MySQL database name
  waitForConnections: true,      // Wait for available connection slots
  connectionLimit: 100,           // Max number of connections in the pool
  queueLimit: 0                  // Max number of requests to queue before returning an error
});

// Wrap the pool to return promises (using async/await)
export const promisePool = pool.promise();
