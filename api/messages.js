const pool = require('../utils/db');
const multer = require('multer');
const { publishToAbly } = require('../utils/ably');
const path = require('path');
const fs = require('fs');

// Set up storage for photo uploads (store in 'uploads' folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');  // Folder where photos will be saved
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Unique file name
  }
});
const upload = multer({ storage: storage });

// Middleware for handling photo uploads in POST request
const uploadPhoto = upload.single('photo');

// Handle requests
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('Request received at: ', new Date().toISOString());
    console.log('Request Method: ', req.method);

    // Handle GET request to fetch messages
    if (req.method === 'GET') {
      const { userId, chatWith } = req.query;

      if (!userId || !chatWith) {
        console.error('Missing query parameters: userId or chatWith');
        return res.status(400).json({ error: 'Missing required query parameters: userId or chatWith' });
      }

      console.log('Fetching messages for userId:', userId, 'chatWith:', chatWith);

      // SQL query to fetch messages between two users
      const sql = 'SELECT * FROM messages WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?) ORDER BY timestamp';
      const [messages] = await pool.query(sql, [userId, chatWith, chatWith, userId]);

      if (messages.length > 0) {
        console.log('Fetched messages:', messages);
        
        // Format the messages to return both text and photo data correctly
        const formattedMessages = messages.map(message => {
          return {
            id: message.id,
            userId: message.userId,
            chatWith: message.chatWith,
            message: message.message,
            photo: message.photo, // This will be either the base64 string or file path
            timestamp: message.timestamp
          };
        });

        return res.status(200).json({ messages: formattedMessages });
      } else {
        console.log('No messages found for this chat');
        return res.status(404).json({ error: 'No messages found for this chat' });
      }
    }

    // Handle POST request to send a message (with optional photo)
  // Handle POST request to send a message (with optional photo)
if (req.method === 'POST') {
  const { userId, chatWith, message, photo } = req.body;

  console.log('POST request received with userId:', userId, 'chatWith:', chatWith, 'message:', message, 'photo:', photo);

  // Validate that both userId and chatWith are present, and either message or photo must be present
  if (!userId || !chatWith || (!message && !photo)) {
    console.error('Missing fields in POST request: userId, chatWith, message/photo');
    return res.status(400).json({ error: 'Missing required fields: userId, chatWith, message/photo' });
  }

  // Check if the message contains photo data
  let photoPath = null;

  // If a photo is uploaded (via multer), get its path
  if (photo) {
    photoPath = photo; // Store the base64 string (or URL if sent as base64)
    // Do not log base64 string or photo URL to avoid unnecessary exposure
  } else if (req.file) {
    // If a file is uploaded (via multer), store the file path
    photoPath = `/uploads/${req.file.filename}`;
    console.log('Photo uploaded, path:', photoPath);
  }

  // Insert the message into the database
  const sql = 'INSERT INTO messages (userId, chatWith, message, photo, timestamp) VALUES (?, ?, ?, ?, NOW())';
  console.log('Inserting message into database:', message, 'Photo:', photoPath);

  // Insert the message (text or empty) and photo (base64 or file path) into the database
  const [result] = await pool.query(sql, [
    userId,
    chatWith,
    message || '',     // If no message, insert an empty string
    photoPath || null   // If no photo, insert null
  ]);

  if (result.affectedRows > 0) {
    console.log('Message inserted successfully');

    const messageData = { userId, chatWith, message, photo: photoPath };

    // Publish to Ably (so other user can see it in real-time)
    try {
      console.log('Publishing to Ably with data:', messageData);
      await publishToAbly(`chat-${chatWith}-${userId}`, 'newMessage', messageData);
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
