const express = require('express');
const pool = require('../utils/db');
const router = express.Router();

// Ensure express.json() middleware is enabled for body parsing
router.use(express.json()); // This will parse JSON bodies for all incoming requests

// Get all messages for a chat
router.get('/messages', async (req, res) => {
  const { userId, chatWith } = req.query;

  // Validate required parameters
  if (!userId || !chatWith) {
    return res.status(400).json({ error: 'Missing required parameters: userId and chatWith' });
  }

  try {
    const query = `
      SELECT * FROM messages 
      WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?)
      ORDER BY timestamp ASC
    `;
    
    const [results] = await pool.query(query, [userId, chatWith, chatWith, userId]);

    return res.status(200).json({ messages: results });
  } catch (err) {
    console.error('Error fetching messages:', err); // Log the error for debugging
    return res.status(500).json({ error: 'Error fetching messages' });
  }
});


// Send a new message
// Send a new message
router.post('/messages', async (req, res) => {
  const { userId, chatWith, message } = req.body;

  // Log the request body for debugging
  console.log('Request body:', req.body);

  // Validate required fields
  if (!userId || !chatWith || !message) {
    return res.status(400).json({ error: 'Missing required fields (userId, chatWith, message)' });
  }

  try {
    const sql = 'INSERT INTO messages (userId, chatWith, message, timestamp) VALUES (?, ?, ?, NOW())';
    await pool.query(sql, [userId, chatWith, message]);

    return res.status(200).json({ message: 'Message sent' });
  } catch (err) {
    console.error('Error inserting message:', err);
    return res.status(500).json({ error: 'Failed to store message' });
  }
});

module.exports = router;

