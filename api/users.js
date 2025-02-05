const pool = require('../utils/db');

module.exports = async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  try {
    const [results] = await pool.query('SELECT id, username FROM users WHERE id != ?', [userId]);

    res.status(200).json({ users: results });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

