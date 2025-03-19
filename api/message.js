const { promisePool } = require('../utils/db'); // ✅ Fixed Import
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

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('Request received:', req.method);

        // Handle GET request to fetch messages
        if (req.method === 'GET') {
            const { username, chatWith } = req.query;

            if (!username || !chatWith) {
                return res.status(400).json({ error: 'Missing required query parameters: username or chatWith' });
            }

            const usernameLower = username.toLowerCase();
            const chatWithLower = chatWith.toLowerCase();

            console.log('Fetching messages for:', usernameLower, chatWithLower);

            const sql = `
                SELECT * FROM messages 
                WHERE (username = ? AND chatWith = ?) OR (username = ? AND chatWith = ?) 
                ORDER BY timestamp
            `;

            const [messages] = await promisePool.execute(sql, [usernameLower, chatWithLower, chatWithLower, usernameLower]);

            return res.status(200).json({
                messages: messages.map(msg => ({
                    id: msg.id,
                    username: msg.username,
                    chatWith: msg.chatWith,
                    message: msg.message,
                    photo: msg.photo,
                    timestamp: msg.timestamp,
                    alignmentClass: msg.username === usernameLower ? 'user-msg' : 'other-msg'
                }))
            });
        }

        // Handle POST request to send a message
        if (req.method === 'POST') {
            const { username, chatWith, message, photo } = req.body;

            if (!username || !chatWith || (!message && !photo)) {
                return res.status(400).json({ error: 'Missing required fields: username, chatWith, message/photo' });
            }

            const usernameLower = username.toLowerCase();
            const chatWithLower = chatWith.toLowerCase();

            let photoPath = photo?.startsWith('data:image') ? photo : null;

            console.log('Inserting message:', usernameLower, chatWithLower, message, photoPath);

            const insertSQL = `
                INSERT INTO messages (username, chatWith, message, photo, timestamp) 
                VALUES (?, ?, ?, ?, NOW())
            `;

            const [result] = await promisePool.execute(insertSQL, [usernameLower, chatWithLower, message || '', photoPath || null]);

            if (result.affectedRows > 0) {
                console.log('Message inserted successfully');

                const messageData = { username: usernameLower, chatWith: chatWithLower, message, photo: photoPath };

                try {
                    await publishToAbly(`chat-${chatWithLower}-${usernameLower}`, 'newMessage', messageData);
                    console.log('Message published to Ably successfully');
                } catch (err) {
                    console.error('Error publishing to Ably:', err);
                    return res.status(500).json({ error: 'Failed to publish message to Ably' });
                }

                return res.status(200).json({ message: 'Message sent successfully' });
            } else {
                return res.status(500).json({ error: 'Failed to insert message into the database' });
            }
        }

        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Unexpected error occurred', details: err.message });
    }
};

