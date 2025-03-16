const pool = require('../utils/db'); // MySQL connection pool

// Set CORS headers for all methods
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins or specify your domain
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');  // Allowed methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  // Allowed headers
};
module.exports = async (req, res) => {
      setCorsHeaders(res);
     // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end(); // End the request immediately after sending a response for OPTIONS
    }
    // Fetch all users excluding the userId
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
    }

    if (req.method === 'GET') {
        try {
            console.log(`Fetching users excluding userId: ${userId}`); // Debugging
            const [results] = await pool.query('SELECT id, username FROM users WHERE id != ?', [userId]);

            if (results.length === 0) {
                return res.status(404).json({ message: 'No users found' });
            }

            return res.status(200).json({ users: results });
        } catch (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ message: 'Server error' });
        }
    }

    // Handle PUT request for updating the username
    if (req.method === 'PUT') {
       const { userId, oldUsername, newUsername } = req.body;

    // Validate the presence of userId, oldUsername, and newUsername
    if (!userId || !oldUsername || !newUsername) {
        return res.status(400).json({ message: 'userId, oldUsername, and newUsername are required' });
    }

    // Perform validation and check if newUsername is available
    if (newUsername === oldUsername) {
        return res.status(400).json({ message: 'Username is the same as the current one.' });
    }

    try {
        // Update the username in MongoDB, using the userId to locate the user
        const user = await User.findByIdAndUpdate(userId, { username: newUsername }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Username updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update username', error: error.message });
    
        }
    }
};


