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

        console.log('UserId:', userId);  // Log the userId for debugging
        console.log('Old Username:', oldUsername);  // Log the old username for debugging
        console.log('New Username:', newUsername);  // Log the new username for debugging

        // Validate the presence of userId, oldUsername, and newUsername
        if (!userId || !oldUsername || !newUsername) {
            return res.status(400).json({ message: 'userId, oldUsername, and newUsername are required' });
        }

        // Check if newUsername is the same as the old one
        if (newUsername === oldUsername) {
            return res.status(400).json({ message: 'Username is the same as the current one.' });
        }

        try {
            // Log the query
            console.log('Querying for user with userId:', userId);

            // Locate the user by userId and update the username in MySQL
            const [results] = await pool.query(
                'UPDATE users SET username = ? WHERE id = ? AND username = ?',
                [newUsername, userId, oldUsername]  // Using userId to ensure the correct user is updated
            );

            console.log('SQL Query Results:', results);  // Log the query result for debugging

            // Check if any rows were affected
            if (results.affectedRows === 0) {
                console.log('User not found or username not updated');  // Log if no rows were updated
                return res.status(404).json({ message: 'User not found or username not updated' });
            }

            // Respond with success message if update is successful
            console.log('Username updated successfully');
            res.status(200).json({ message: 'Username updated successfully' });
        } catch (error) {
            // Log the error message if there’s an error
            console.error('Error updating username:', error);
            res.status(500).json({ message: 'Failed to update username', error: error.message });
        }
    }

};


