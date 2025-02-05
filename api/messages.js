const express = require('express');
const pool = require('../utils/db');
const router = express.Router();

// Get all messages for a chat
router.get('/', (req, res) => {
  const { userId, chatWith } = req.query;

  // Validate required parameters
  if (!userId || !chatWith) {
    return res.status(400).json({ error: 'Missing required parameters: userId and chatWith' });
  }

  const query = `
    SELECT * FROM messages 
    WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?)
    ORDER BY timestamp ASC
  `;

  pool.query(query, [userId, chatWith, chatWith, userId], (err, results) => {
    if (err) {
      console.error('Error fetching messages:', err);
      return res.status(500).json({ error: 'Error fetching messages' });
    }
    res.status(200).json({ messages: results });
  });
});

// Send a new message
router.post('/', (req, res) => {
  const { userId, chatWith, message } = req.body;

  // Validate the required fields
  if (!userId || !chatWith || !message) {
    return res.status(400).json({ error: 'Missing required fields (userId, chatWith, message)' });
  }

  // SQL query to insert the new message
  const sql = 'INSERT INTO messages (userId, chatWith, message) VALUES (?, ?, ?)';

  pool.query(sql, [userId, chatWith, message], (err, result) => {
    if (err) {
      console.error('Error inserting message:', err);
      return res.status(500).json({ error: 'Failed to store message' });
    }

    res.status(200).json({ message: 'Message sent' });
  });
});

module.exports = router;

