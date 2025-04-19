const { promisePool } = require('../utils/db');  // ✅ Fix import

// Function to set CORS headers
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
           const [users] = await promisePool.execute('SELECT id, username, profile_picture FROM users');

        console.log('Users:', users);  // Log the users to verify the query results
      const userProfiles = users.map(user => ({
    id: user.id,
    username: user.username,
    profile_picture: user.profile_picture || 'https://latestnewsandaffairs.site/public/pfp2.jpg',
}));
        // Respond with the list of users and their profile pictures
        res.status(200).json(userProfiles);
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ message: 'Error fetching users', error });
    }
}

// Default export
module.exports = handler;


