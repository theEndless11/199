const express = require('express');
const pool = require('../utils/db');

const router = express.Router();

// Get all messages for a chat
router.get('/', (req, res) => {
  const { userId, chatWith } = req.query;

  const query = `
    SELECT * FROM messages 
    WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?)
    ORDER BY timestamp ASC
  `;

  pool.query(query, [userId, chatWith, chatWith, userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching messages' });
    }
    res.status(200).json({ messages: results });
  });
});

// Send a new message
router.post('/', (req, res) => {
  const { userId, chatWith, message } = req.body;

  const sql = 'INSERT INTO messages (userId, chatWith, message) VALUES (?, ?, ?)';
  pool.query(sql, [userId, chatWith, message], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to store message' });
    }

    res.json({ message: 'Message sent' });
  });
});

module.exports = router;
