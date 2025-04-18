import { promisePool } from '../utils/db';
import jwt from 'jsonwebtoken';

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'PUT') {
        const { userId, oldUsername, newUsername } = req.body;

        if (!userId || !oldUsername || !newUsername) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        try {
            await promisePool.query('START TRANSACTION');

            // Update the username
            const [updateResult] = await promisePool.query(
                'UPDATE users SET username = ? WHERE id = ? AND username = ?',
                [newUsername, userId, oldUsername]
            );

            if (updateResult.affectedRows === 0) {
                await promisePool.query('ROLLBACK');
                return res.status(404).json({ message: 'User not found or username unchanged' });
            }

            // Update posts or other tables that reference the username
            await promisePool.query(
                'UPDATE posts SET username = ? WHERE username = ?',
                [newUsername, oldUsername]
            );

            await promisePool.query('COMMIT');

            // 🔐 Re-sign JWT with new username
            const token = jwt.sign(
                { userId, username: newUsername },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRATION || '2y' }
            );

            res.status(200).json({
                message: 'Username updated successfully',
                username: newUsername,
                token
            });

        } catch (error) {
            await promisePool.query('ROLLBACK');
            console.error('🔥 Username update error:', error);
            res.status(500).json({ message: 'Failed to update username', error: error.message });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}


