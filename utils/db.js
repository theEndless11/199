import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

// Create a connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
   connectionLimit: 100,           // Max number of connections in the pool
  queueLimit: 0    
});

// Enable promise-based queries
const promisePool = pool.promise();
export { promisePool };
