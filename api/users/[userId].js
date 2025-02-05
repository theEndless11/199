// /api/users/[userId].js

import { pool } from '../../utils/db';  // Assuming your DB connection is in utils/db.js

export default async function handler(req, res) {
  const { userId } = req.query;  // Get the userId from the URL parameter

  if (req.method === 'GET') {
    try {
      // Query the database to get a user by the userId
      const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [userId]);

      if (rows.length === 0) {
        // If no user found, send a 404 error
        return res.status(404).json({ message: 'User not found' });
      }

      // Send the user data back as a response
      res.status(200).json({ user: rows[0] });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    // If method is not GET, respond with 405 Method Not Allowed
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
