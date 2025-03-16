import mysql from 'mysql2';

require('dotenv').config(); // To load environment variables from .env

// Create a connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Number of connections allowed in the pool
  queueLimit: 0 // Unlimited queue length
});

// Wrap the pool to return promises (using async/await)
export const promisePool = pool.promise();
