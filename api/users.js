const pool = require('../utils/db'); // MySQL connection pool

module.exports = async (req, res) => {
    const userId = req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
    }

    try {
        console.log(`Fetching users excluding userId: ${userId}`); // Debugging
        const [results] = await pool.query('SELECT id, username FROM users WHERE id != ?', [userId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        res.status(200).json({ users: results });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


