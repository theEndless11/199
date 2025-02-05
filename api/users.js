// /api/users.js
import { pool } from '../../utils/db';

export default async function handler(req, res) {
    try {
        const [rows] = await pool.query('SELECT id, username FROM users');
        res.status(200).json({ users: rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
