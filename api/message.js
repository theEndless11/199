const { promisePool } = require('../utils/db'); // ✅ Correct
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

    // Ensure both username and chatWith are in lowercase to avoid case sensitivity issues
    const usernameLower = username.toLowerCase();
    const chatWithLower = chatWith.toLowerCase();

    console.log('Fetching messages for username:', usernameLower, 'chatWith:', chatWithLower);

    // Query to fetch messages directly based on username and chatWith
    const sql = `
        SELECT * FROM messages 
        WHERE (username = ? AND chatWith = ?) OR (username = ? AND chatWith = ?) 
        ORDER BY timestamp
    `;
    try {
        const [messages] = await pool.execute(sql, [usernameLower, chatWithLower, chatWithLower, usernameLower]);

        if (messages.length > 0) {
            console.log('Fetched messages:', messages);

            const formattedMessages = messages.map(message => ({
                id: message.id,
                username: message.username,
                chatWith: message.chatWith,
                message: message.message,
                photo: message.photo,  
                timestamp: message.timestamp,
                // Add alignment class based on the username
                alignmentClass: message.username === usernameLower ? 'user-msg' : 'other-msg'
            }));

            return res.status(200).json({ messages: formattedMessages });
        } else {
            console.log('No messages found for this chat');
            return res.status(404).json({ error: 'No messages found for this chat' });
        }
    } catch (err) {
        console.error('Error fetching messages from database:', err);
        return res.status(500).json({ error: 'Failed to fetch messages from the database' });
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

    // Ensure both username and chatWith are in lowercase to avoid case sensitivity issues
    const usernameLower = username.toLowerCase();
    const chatWithLower = chatWith.toLowerCase();

    let photoPath = null;

    // Handle base64 photo data
    if (photo && photo.startsWith('data:image')) {
        photoPath = photo;  // Store the base64 string directly
    }

    // Log values for debugging
    console.log('Inserting message with username:', usernameLower, 'chatWith:', chatWithLower, 'message:', message, 'photo:', photoPath);

    // Insert the message into the database (no need for userId lookup)
    const sql = `
        INSERT INTO messages (username, chatWith, message, photo, timestamp) 
        VALUES (?, ?, ?, ?, NOW())
    `;
    try {
        const [result] = await pool.execute(sql, [
            usernameLower,  // Corrected insertion for username
            chatWithLower,  // Corrected insertion for chatWith
            message || '',   
            photoPath || null  
        ]);

        if (result.affectedRows > 0) {
            console.log('Message inserted successfully');

            // Ensure correct data is passed
            const messageData = { username: usernameLower, chatWith: chatWithLower, message, photo: photoPath };

            try {
                console.log('Publishing to Ably with data:', messageData);
                await publishToAbly(`chat-${chatWithLower}-${usernameLower}`, 'newMessage', messageData);
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
    } catch (err) {
        console.error('Error inserting message into the database:', err);
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

