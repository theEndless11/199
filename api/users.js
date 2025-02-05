const express = require('express');
const pool = require('../utils/db');

const router = express.Router();

// Get a specific user by ID (for the logged-in user)
router.get('/:userId', (req, res) => {
  const { userId } = req.params; // Get userId from the URL parameters

  pool.query('SELECT id, username FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: results[0] });
  });
});

// Get all users excluding the current logged-in user
router.get('/', (req, res) => {
  const userId = req.query.userId; // Get the logged-in user's ID from the query parameter

  pool.query('SELECT id, username FROM users WHERE id != ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(200).json({ users: results });
  });
});

module.exports = router;

