const { promisePool } = require('../utils/db');

// Set CORS headers for all methods
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async function handler(req, res) {
    setCorsHeaders(res);

    // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        try {
            // Get friends list - users with accepted relationship status
            const friendsQuery = `
                SELECT DISTINCT
                    CASE 
                        WHEN f.follower = ? THEN u2.username
                        WHEN f.following = ? THEN u1.username
                    END as friend_username,
                    CASE 
                        WHEN f.follower = ? THEN u2.id
                        WHEN f.following = ? THEN u1.id
                    END as friend_id,
                    CASE 
                        WHEN f.follower = ? THEN u2.profile_picture
                        WHEN f.following = ? THEN u1.profile_picture
                    END as friend_profile_picture
                FROM follows f
                LEFT JOIN users u1 ON f.follower = u1.username
                LEFT JOIN users u2 ON f.following = u2.username
                WHERE (f.follower = ? OR f.following = ?) 
                AND f.relationship_status = 'accepted'
                AND (u1.username IS NOT NULL AND u2.username IS NOT NULL)
            `;

            const [friendsResult] = await promisePool.execute(friendsQuery, [
                username, username, username, username, username, username, username, username
            ]);

            // Format friends list
            const friendsList = friendsResult
                .filter(friend => friend.friend_username) // Filter out any null usernames
                .map(friend => ({
                    id: friend.friend_id,
                    username: friend.friend_username,
                    profile_picture: friend.friend_profile_picture || 'https://latestnewsandaffairs.site/public/pfp.jpg'
                }));

            // Response payload
            const response = {
                username: username,
                friends: friendsList,
                totalFriends: friendsList.length
            };

            return res.status(200).json(response);

        } catch (error) {
            console.error("❌ Error fetching friends list:", error);
            return res.status(500).json({ message: 'Error retrieving friends list', error: error.message });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
};



