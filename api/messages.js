const pool = require('../utils/db');

// Get all messages for a chat
module.exports = async (req, res) => {
  const { userId, chatWith } = req.query;

  // Validate required parameters
  if (!userId || !chatWith) {
    return res.status(400).json({ error: 'Missing required parameters: userId and chatWith' });
  }

  try {
    // Log the query parameters for debugging
    console.log('Fetching messages for:', { userId, chatWith });

    const query = `
      SELECT * FROM messages 
      WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?)
      ORDER BY timestamp ASC
    `;

    const [results] = await pool.query(query, [userId, chatWith, chatWith, userId]);

    return res.status(200).json({ messages: results });
  } catch (err) {
    console.error('Error fetching messages:', err);
    return res.status(500).json({ error: 'Error fetching messages', details: err.message });
  }
};

// Send a new message
module.exports.sendMessage = async (req, res) => {
  const { userId, chatWith, message } = req.body;

  // Log the request body for debugging
  console.log('Received message data:', req.body);

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
    return res.status(500).json({ error: 'Failed to store message', details: err.message });
  }
};

