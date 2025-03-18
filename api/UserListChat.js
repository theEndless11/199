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

        // Query to fetch usernames from the users table
        const [users] = await promisePool.execute('SELECT username FROM users');
        console.log('Users:', users);  // Log the users to verify the query results

        // Step 2: Fetch profile pictures in a single query (Optimization)
        const usernames = users.map(user => user.username);
        let profilePics = [];

        if (usernames.length > 0) {
            const placeholders = usernames.map(() => '?').join(',');
            const query = `SELECT username, profile_picture FROM posts WHERE username IN (${placeholders})`;
            const [profilePicResults] = await promisePool.execute(query, usernames);

            profilePics = profilePicResults.reduce((acc, row) => {
                acc[row.username] = row.profile_picture;
                return acc;
            }, {});
        }

        // Step 3: Combine results
        const userProfiles = users.map(user => ({
            username: user.username,
            profile_picture: profilePics[user.username] || 'https://latestnewsandaffairs.site/public/pfp3.jpg', // Default if no picture
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

