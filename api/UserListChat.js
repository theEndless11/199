const { promisePool } = require('../utils/db');  // Make sure the path is correct

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

        // Step 2: Loop through the users and fetch the corresponding profile_picture from the posts table
        const userProfiles = [];

        for (const user of users) {
            // Query to fetch profile picture from posts where the username matches
            const [profilePic] = await promisePool.execute('SELECT profile_picture FROM posts WHERE username = ?', [user.username]);

            // Log the profilePic to verify the query results
            console.log('Profile picture for user', user.username, profilePic);

            // Add the user data along with the profile picture (fallback to default if none found)
            userProfiles.push({
                username: user.username,
                profile_picture: profilePic.length > 0 ? profilePic[0].profile_picture : 'https://latestnewsandaffairs.site/public/pfp3.jpg', // Default image URL if no profile picture
            });
        }

        // Respond with the list of users and their profile pictures
        res.status(200).json(userProfiles);
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ message: 'Error fetching users', error });
    }
}

// Default export
module.exports = handler;

