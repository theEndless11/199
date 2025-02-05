// /utils/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'srv787.hstgr.io', // Replace with your DB host
  user: 'u208245805_Crypto21', // Replace with your DB username
  password: 'crypto21@', // Replace with your DB password
  database: 'u208245805_Crypto21', // Replace with your database name
});

module.exports = { pool };
