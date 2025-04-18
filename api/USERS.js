import { promisePool } from '../utils/db';  // Use ES module import for promisePool

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// Export using ES module style
export default async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'PUT') {
        const { userId, oldUsername, newUsername } = req.body;

        try {
            // Start transaction
            await promisePool.query('START TRANSACTION');

            // Update username in users table
            await promisePool.query(
                'UPDATE users SET username = ? WHERE id = ? AND username = ?',
                [newUsername, userId, oldUsername]
            );

            // Update username in posts table
            await promisePool.query(
                'UPDATE posts SET username = ? WHERE username = ?',
                [newUsername, oldUsername]
            );

            // Commit transaction
            await promisePool.query('COMMIT');

            res.status(200).json({ message: 'Username updated successfully' });
        } catch (error) {
            await promisePool.query('ROLLBACK');
            res.status(500).json({ message: 'Failed to update username', error: error.message });
        }
    }
}

