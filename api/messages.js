const pool = require('../utils/db'); // This must be promisePool from db.js
const { publishToAbly } = require('../utils/ably');
console.log('publishToAbly function:', publishToAbly);  // Log the imported function

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('Request received at: ', new Date().toISOString());

    // Handle GET request to fetch messages
    if (req.method === 'GET') {
      const { userId, chatWith } = req.query;

      // Validate required query parameters
      if (!userId || !chatWith) {
        console.error('Missing query parameters');
        return res.status(400).json({ error: 'Missing required query parameters: userId, chatWith' });
      }
const sql = 'SELECT * FROM messages WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?) ORDER BY timestamp';
const [messages] = await pool.query(sql, [userId, chatWith, chatWith, userId]);

// Ensure messages include timestamps when sent to the frontend
return res.status(200).json({ messages });

      if (messages.length > 0) {
        console.log('Fetched messages:', messages);
        return res.status(200).json({ messages });  // Return messages in the response
      } else {
        console.log('No messages found');
        return res.status(404).json({ error: 'No messages found for this chat' });
      }
    }

    // Handle POST request to send a message
    if (req.method === 'POST') {
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

        // Now publish the message to Ably for real-time push to the other user
        try {
          console.log('Publishing to Ably:', messageData);
          
          // Publish the message to the **other user (chatWith)** channel
          await publishToAbly(chat-${chatWith}-${userId}, 'newMessage', messageData); // Push to the Ably channel for the other user
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
