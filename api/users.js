const pool = require('../utils/db'); // MySQL connection pool

module.exports = async (req, res) => {
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
        const { oldUsername, newUsername } = req.body;

        // Perform validation and check if newUsername is available
        if (newUsername === oldUsername) {
            return res.status(400).json({ message: 'Username is the same as the current one.' });
        }

        try {
            // Update the username in MongoDB
            const user = await User.findOneAndUpdate({ username: oldUsername }, { username: newUsername });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({ message: 'Username updated successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to update username', error: error.message });
        }
    }
};


