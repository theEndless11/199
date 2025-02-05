const express = require('express');
const pool = require('../utils/db');
const router = express.Router();

// Get a specific user by ID (for the logged-in user)
router.get('/:userId', (req, res) => {
  const { userId } = req.params; // Get userId from the URL parameters
  console.log('Received request to fetch user with ID:', userId); // Log the userId received in request
  
  pool.query('SELECT id, username FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err); // Log database errors
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      console.log(`User with ID ${userId} not found`); // Log when user is not found
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User data fetched:', results[0]); // Log fetched user data
    res.status(200).json({ user: results[0] });
  });
});

module.exports = router;
