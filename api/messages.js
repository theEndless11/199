// api/messages.js

const pool = require('../utils/db');
const { publishToAbly } = require('../utils/ably'); // Assuming this is already set up

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { userId, chatWith } = req.query;
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
      console.error('Error fetching messages:', err);
      return res.status(500).json({ error: 'Error fetching messages', details: err.message });
    }
  } else if (req.method === 'POST') {
    const { userId, chatWith, message } = req.body;

    if (!userId || !chatWith || !message) {
      return res.status(400).json({ error: 'Missing required fields (userId, chatWith, message)' });
    }

    try {
      const sql = 'INSERT INTO messages (userId, chatWith, message, timestamp) VALUES (?, ?, ?, NOW())';
      await pool.query(sql, [userId, chatWith, message]);

      // Publish message to Ably after successful insertion
      const messageData = { userId, chatWith, message };
      await publishToAbly('newMessage', messageData);

      return res.status(200).json({ message: 'Message sent' });
    } catch (err) {
      console.error('Error inserting message:', err);
      return res.status(500).json({ error: 'Failed to store message', details: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};

