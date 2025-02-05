const mysql = require('mysql2');
require('dotenv').config(); // To load environment variables from .env

// Ensure environment variables are loaded
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.error('Missing database environment variables!');
  process.exit(1); // Stop execution if environment variables are missing
}

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
module.exports = pool.promise(); // We use .promise() to enable async/await
