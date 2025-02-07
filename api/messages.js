const pool = require('../utils/db'); // This must be promisePool from db.js
const { publishToAbly } = require('../utils/ably');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('Request received at: ', new Date().toISOString());

    if (req.method === 'POST') {
      console.log('POST request data:', req.body);

      const { userId, chatWith, message } = req.body;

      // Validate required fields
      if (!userId || !chatWith || !message) {
        console.error('Missing fields in POST request');
        return res.status(400).json({ error: 'Missing required fields: userId, chatWith, message' });
      }

      const sql = 'INSERT INTO messages (userId, chatWith, message, timestamp) VALUES (?, ?, ?, NOW())';
      console.log('Inserting message:', message);
      const [result] = await pool.query(sql, [userId, chatWith, message]);

      if (result.affectedRows > 0) {
        console.log('Message inserted successfully');

        const messageData = { userId, chatWith, message };

        try {
          console.log('Publishing to Ably:', messageData);
          await publishToAbly('newMessage', messageData); // Check if this call is slow
          console.log('Message published to Ably successfully');
        } catch (err) {
          console.error('Error publishing to Ably:', err);
          return res.status(500).json({ error: 'Failed to publish message to Ably' });
        }

        return res.status(200).json({ message: 'Message sent successfully' });
      } else {
        console.error('Message insertion failed');
        return res.status(500).json({ error: 'Failed to insert message into the database' });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error occurred', details: err.message });
  }
};
