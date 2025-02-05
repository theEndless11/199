// /api/users.js

import { pool } from '../../utils/db';  // Assuming your DB connection is in utils/db.js

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Query all users from the database
      const [rows] = await pool.query('SELECT id, username FROM users');
      // Send the users as a response
      res.status(200).json({ users: rows });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    // If method is not GET, respond with 405 Method Not Allowed
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
