const pool = require('../utils/db'); // This must be promisePool from db.js
const { publishToAbly } = require('../utils/ably');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer for image upload (stored in the 'uploads' directory)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save uploaded files in 'uploads/' folder
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir); // Create the folder if it doesn't exist
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname); // Get the file extension
    const fileName = Date.now() + fileExtension; // Unique filename
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage }).single('image'); // Single image upload (field name 'image')

// The main API handler
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

      if (messages.length > 0) {
        console.log('Fetched messages:', messages);
        return res.status(200).json({ messages });  // Return messages in the response
      } else {
        console.log('No messages found');
        return res.status(404).json({ error: 'No messages found for this chat' });
      }
    }

    // Handle POST request to send a message (including text and image)
    if (req.method === 'POST') {
      const { userId, chatWith, message } = req.body;

      // Validate required fields
      if (!userId || !chatWith || (!message && !req.file)) {
        console.error('Missing fields in POST request');
        return res.status(400).json({ error: 'Missing required fields: userId, chatWith, message or image' });
      }

      let messageData = { userId, chatWith, message };

      // If an image is uploaded, add the image URL to the message
      if (req.file) {
        const imageUrl = `/uploads/${req.file.filename}`; // Assuming images are stored in 'uploads/'
        messageData.imageUrl = imageUrl; // Attach the image URL to the message
      }

      // Insert the message (text and/or image URL) into the database
      const sql = 'INSERT INTO messages (userId, chatWith, message, imageUrl, timestamp) VALUES (?, ?, ?, ?, NOW())';
      console.log('Inserting message:', messageData);
      const [result] = await pool.query(sql, [userId, chatWith, messageData.message, messageData.imageUrl || null]);

      if (result.affectedRows > 0) {
        console.log('Message inserted successfully');

        // Prepare the message data to be sent to Ably
        const messageToSend = {
          userId: userId,
          chatWith: chatWith,
          message: messageData.message,
          imageUrl: messageData.imageUrl || null,
          timestamp: new Date().toISOString()
        };

        // Publish the message to Ably
        try {
          console.log('Publishing to Ably:', messageToSend);
          await publishToAbly(`chat-${chatWith}-${userId}`, 'newMessage', messageToSend);
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


