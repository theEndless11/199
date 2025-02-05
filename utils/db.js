// /utils/db.js
const mysql = require('mysql2/promise'); // <-- Make sure you're using the promise-based version here
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

// Export the pool so it can be used by other files
module.exports = pool;  // No need for .promise() since `mysql2/promise` was already used
