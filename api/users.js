const express = require('express');
const pool = require('../utils//db');

const router = express.Router();

// Get all users, excluding the current user
router.get('/', (req, res) => {
  const userId = req.query.userId;

  pool.query('SELECT id, username FROM users WHERE id != ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(200).json({ users: results });
  });
});

module.exports = router;
