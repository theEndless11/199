const pool = require('../utils/db'); // This must be promisePool from db.js
const { publishToAbly } = require('../utils/ably');  // Assuming this is already set up

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const start = Date.now();  // Capture the start time

    if (req.method === 'GET') {
      const { userId, chatWith } = req.query;
      console.log(`GET request received at ${new Date(start).toISOString()}. userId: ${userId}, chatWith: ${chatWith}`);

      if (!userId || !chatWith) {
        console.error('Missing required parameters in GET request');
        return res.status(400).json({ error: 'Missing required parameters: userId and chatWith' });
      }

      const query = `
        SELECT * FROM messages 
        WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?)
        ORDER BY timestamp ASC
      `;
      console.log(`Executing DB query at ${new Date().toISOString()}`);
      const [results] = await pool.query(query, [userId, chatWith, chatWith, userId]);

      const queryTime = Date.now() - start;
      console.log(`DB query completed in ${queryTime}ms`);

      if (results.length > 0) {
        return res.status(200).json({ messages: results });
      } else {
        return res.status(200).json({ messages: [] });
      }
    } else if (req.method === 'POST') {
      const { userId, chatWith, message } = req.body;
      console.log(`POST request received at ${new Date(start).toISOString()}. userId: ${userId}, chatWith: ${chatWith}, message: ${message}`);

      if (!userId || !chatWith || !message) {
        console.error('Missing required fields in POST request');
        return res.status(400).json({ error: 'Missing required fields: userId, chatWith, message' });
      }

      const sql = 'INSERT INTO messages (userId, chatWith, message, timestamp) VALUES (?, ?, ?, NOW())';
      console.log(`Inserting message at ${new Date().toISOString()}:`, sql);
      const [result] = await pool.query(sql, [userId, chatWith, message]);

      const insertTime = Date.now() - start;
      console.log(`Message insertion completed in ${insertTime}ms`);

      if (result.affectedRows > 0) {
        console.log('Message inserted successfully:', message);

        const messageData = { userId, chatWith, message };

        try {
          console.log(`Publishing message to Ably at ${new Date().toISOString()}:`, messageData);
          await publishToAbly('newMessage', messageData);
          console.log('Message published to Ably:', messageData);
        } catch (err) {
          console.error('Error publishing to Ably:', err);
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

