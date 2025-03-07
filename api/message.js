const pool = require('../utils/db');
const { publishToAbly } = require('../utils/ably');

// Set CORS headers for all methods
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');  
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  
};

// Serverless API handler for chat messages
module.exports = async function handler(req, res) {
    setCorsHeaders(res);

    // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('Request received at:', new Date().toISOString());
        console.log('Request Method:', req.method);

        // Handle GET request to fetch messages
    if (req.method === 'GET') {
    const { username, chatWith } = req.query;

    if (!username || !chatWith) {
        console.error('Missing query parameters: username or chatWith');
        return res.status(400).json({ error: 'Missing required query parameters: username or chatWith' });
    }

    console.log('Fetching messages for username:', username, 'chatWith:', chatWith);

    // Fetch the userId based on username
    const [userResult] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (userResult.length === 0) {
        console.error('User not found for username:', username);
        return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult[0].id;

    // Query to fetch messages between the users
    const sql = `
        SELECT * FROM messages 
        WHERE (userId = ? AND chatWith = ?) OR (userId = ? AND chatWith = ?) 
        ORDER BY timestamp
    `;
    const [messages] = await pool.execute(sql, [userId, chatWith, chatWith, userId]);

    if (messages.length > 0) {
        console.log('Fetched messages:', messages);

        const formattedMessages = messages.map(message => ({
            id: message.id,
            userId: message.userId,
            chatWith: message.chatWith,
            message: message.message,
            photo: message.photo,  
            timestamp: message.timestamp
        }));

        return res.status(200).json({ messages: formattedMessages });
    } else {
        console.log('No messages found for this chat');
        return res.status(404).json({ error: 'No messages found for this chat' });
    }
}

        // Handle POST request to send a message (with optional photo)
  if (req.method === 'POST') {
    const { username, chatWith, message, photo } = req.body;

    console.log('POST request received with username:', username, 'chatWith:', chatWith, 'message:', message, 'photo:', photo);

    if (!username || !chatWith || (!message && !photo)) {
        console.error('Missing fields in POST request: username, chatWith, message/photo');
        return res.status(400).json({ error: 'Missing required fields: username, chatWith, message/photo' });
    }

    // Fetch the userId based on username
    const [userResult] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (userResult.length === 0) {
        console.error('User not found for username:', username);
        return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult[0].id;

    let photoPath = null;

    // Handle base64 photo data
    if (photo && photo.startsWith('data:image')) {
        photoPath = photo;  // Store the base64 string directly
    }

    // Insert the message into the database
    const sql = `
        INSERT INTO messages (userId, chatWith, message, photo, timestamp) 
        VALUES (?, ?, ?, ?, NOW())
    `;
    console.log('Inserting message into database:', message, 'Photo:', photoPath);

    const [result] = await pool.execute(sql, [
        userId,
        chatWith,
        message || '',   
        photoPath || null  
    ]);

    if (result.affectedRows > 0) {
        console.log('Message inserted successfully');

        const messageData = { userId, chatWith, message, photo: photoPath };

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
        // If method is not GET or POST, return 405
        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Unexpected error occurred', details: err.message });
    }
};
