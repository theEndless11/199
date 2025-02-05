const pool = require('../utils/db');

// Get all messages for a chat
module.exports = async (req, res) => {
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

    // Fetch messages from DB
    const [results] = await pool.query(query, [userId, chatWith, chatWith, userId]);

    return res.status(200).json({ messages: results });
  } catch (err) {
    console.error('Error fetching messages:', err);
    return res.status(500).json({ error: 'Error fetching messages' });
  }
};

// Send a new message
module.exports.sendMessage = async (req, res) => {
  const { userId, chatWith, message } = req.body;

  // Validate required fields
  if (!userId || !chatWith || !message) {
    return res.status(400).json({ error: 'Missing required fields (userId, chatWith, message)' });
  }

  try {
    // SQL query to insert the new message
    const sql = 'INSERT INTO messages (userId, chatWith, message, timestamp) VALUES (?, ?, ?, NOW())';

    // Insert the new message into DB
    await pool.query(sql, [userId, chatWith, message]);

    return res.status(200).json({ message: 'Message sent' });
  } catch (err) {
    console.error('Error inserting message:', err);
    return res.status(500).json({ error: 'Failed to store message' });
  }
};


