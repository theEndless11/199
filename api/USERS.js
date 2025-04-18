import { promisePool } from '../utils/db';  // Use ES module import for promisePool
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

    try {
        // Start transaction
        await pool.query('START TRANSACTION');

        // Update username in users table
        await pool.query(
            'UPDATE users SET username = ? WHERE id = ? AND username = ?',
            [newUsername, userId, oldUsername]
        );

        // Update username in posts table
        await pool.query(
            'UPDATE posts SET username = ? WHERE username = ?',
            [newUsername, oldUsername]
        );

        // Commit transaction
        await pool.query('COMMIT');

        res.status(200).json({ message: 'Username updated successfully' });
    } catch (error) {
        // Rollback on error
        await pool.query('ROLLBACK');
        res.status(500).json({ message: 'Failed to update username', error: error.message });
    }
}};
