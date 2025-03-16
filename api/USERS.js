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
   // Handle PUT request for updating the username
    if (req.method === 'PUT') {
        const { userId, oldUsername, newUsername } = req.body;

        console.log('Received request body:', req.body);  // Log the whole body for debugging

        // Validate the presence and types of userId, oldUsername, and newUsername
        if (!userId || !oldUsername || !newUsername) {
            return res.status(400).json({ message: 'userId, oldUsername, and newUsername are required' });
        }

        if (typeof userId !== 'string' || typeof oldUsername !== 'string' || typeof newUsername !== 'string') {
            return res.status(400).json({ message: 'userId, oldUsername, and newUsername must be strings' });
        }

        // Check if newUsername is the same as the old one
        if (newUsername === oldUsername) {
            return res.status(400).json({ message: 'Username is the same as the current one.' });
        }

        try {
            // Check if the user exists with the old username
            const [userResults] = await pool.query('SELECT id, username FROM users WHERE id = ? AND username = ?', [userId, oldUsername]);

            if (userResults.length === 0) {
                return res.status(404).json({ message: 'User not found or old username does not match' });
            }

            // Update the username in MySQL
            const [updateResults] = await pool.query(
                'UPDATE users SET username = ? WHERE id = ? AND username = ?',
                [newUsername, userId, oldUsername]
            );

            console.log('SQL Query Results:', updateResults);  // Log the query result for debugging

            // Check if any rows were affected
            if (updateResults.affectedRows === 0) {
                console.log('No rows were updated'); // Log if no rows were updated
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
