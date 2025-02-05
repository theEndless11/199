// api/users/[userId].js

import { pool } from "../../utils/db";  // Adjust the path to match your actual DB connection utility

export default async function handler(req, res) {
    const { userId } = req.query;  // Extract the userId from the query parameters

    try {
        // Query the database for the specific user by userId
        const result = await pool.query('SELECT id, username FROM users WHERE id = ?', [userId]);

        if (result.length === 0) {
            // If no user is found, return a 404 error
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the user data
        res.status(200).json({ user: result[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
