const express = require('express');
const pool = require('../../utils/db'); // Adjust the path if necessary
const router = express.Router();

// Get all users excluding the logged-in user
router.get('/', (req, res) => {
    const { userId } = req.query; // Get userId from query parameters

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    pool.query('SELECT id, username FROM users WHERE id != ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }

        res.status(200).json({ users: results });
    });
});

module.exports = router;
