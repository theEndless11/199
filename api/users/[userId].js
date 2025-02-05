import pool from '../../utils/db'; // Import database connection

// Handler for fetching a user by ID
export default async function handler(req, res) {
  const { userId } = req.query;
  console.log(`Received request for user with ID: ${userId}`);

  try {
    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [userId]);

    if (rows.length === 0) {
      console.log('No user found');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', rows[0]);
    return res.status(200).json({ user: rows[0] });
  } catch (error) {
    console.error('Database error:', error); // Log the error for more details
    return res.status(500).json({ message: 'Server error' });
  }
}

