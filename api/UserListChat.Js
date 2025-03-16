const { promisePool } = require('../utils/db');  // Assuming promisePool is your MySQL connection pool

// Function to set CORS headers
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins, or specify a specific one (e.g. 'https://example.com')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow necessary methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow necessary headers
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Enable credentials if needed
};

// API handler to fetch users and their profile pictures
const handler = async (req, res) => {
    try {
        // Handle OPTIONS request (preflight check for CORS)
        if (req.method === 'OPTIONS') {
            setCorsHeaders(res);
            return res.status(204).end();  // Return 204 for preflight response
        }

        setCorsHeaders(res); // Set CORS headers for actual request

        // Query to fetch users and their profile pictures
        const [users] = await promisePool.execute('SELECT username, profile_picture FROM posts');

        // Respond with the list of users
        res.status(200).json(users);
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

// Default export
module.exports = handler;
