const pool = require('../utils/db'); // This must be promisePool from db.js
const { publishToAbly } = require('../utils/ably');  // Assuming this is already set up

module.exports = async (req, res) => {
  // Ensure that we always return JSON responses
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET') {
      const { userId, chatWith } = req.query;
      console.log('GET request received. userId:', userId, 'chatWith:', chatWith); // Log for GET request

      if (!userId || !chatWith) {
        console.error('Missing required parameters in GET request');
        return res.status(400).json({ error: 'Missing required parameters: userId and chatWith' });
      }

      const query = `
        SELECT * FROM messages 
        WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?)
        ORDER BY timestamp ASC
      `;
      console.log('Executing DB query for GET request: ', query);  // Log the query being executed
      const [results] = await pool.query(query, [userId, chatWith, chatWith, userId]);

      if (results.length > 0) {
        console.log('Messages fetched from DB:', results); // Log fetched messages
        return res.status(200).json({ messages: results });
      } else {
        console.log('No messages found for this chat');
        return res.status(200).json({ messages: [] });  // Handle case where no messages exist
      }
    } else if (req.method === 'POST') {
      const { userId, chatWith, message } = req.body;

      console.log('POST request received. userId:', userId, 'chatWith:', chatWith, 'message:', message); // Log for POST request

      // Validate the required fields
      if (!userId || !chatWith || !message) {
        console.error('Missing required fields in POST request');
        return res.status(400).json({ error: 'Missing required fields: userId, chatWith, message' });
      }

      // Insert the new message into the database
      const sql = 'INSERT INTO messages (userId, chatWith, message, timestamp) VALUES (?, ?, ?, NOW())';
      console.log('Inserting message into DB:', sql);  // Log the SQL query for insert
      const [result] = await pool.query(sql, [userId, chatWith, message]);

      // Check if the insert was successful
      if (result.affectedRows > 0) {
        console.log('Message inserted successfully:', message);

        // Prepare the message data for Ably
        const messageData = { userId, chatWith, message };

        try {
          // Publish the new message to Ably for real-time updates
          console.log('Publishing message to Ably:', messageData);  // Log the message being published
          await publishToAbly('newMessage', messageData);
          console.log('Message published to Ably:', messageData);
        } catch (err) {
          console.error('Error publishing to Ably:', err);  // Log error if Ably fails
          return res.status(500).json({ error: 'Failed to publish message to Ably' });
        }

        return res.status(200).json({ message: 'Message sent successfully' });
      } else {
        console.error('Message insertion failed:', message);
        return res.status(500).json({ error: 'Failed to insert message into the database' });
      }
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error occurred', details: err.message });
  }
};

