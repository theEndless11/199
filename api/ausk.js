import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { promisePool } from '../utils/db';  // Use ES module import for promisePool

// Set CORS headers for all methods
const setCorsHeaders = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
};

// Handle pre-flight OPTIONS requests (CORS)
const handlePreflight = (req, res) => {
    res.status(200).end();
};

export default async (req, res) => {  // Use export default for ES module
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return handlePreflight(req, res);
    }

    const { email, password, action, profilePic } = req.body;

    if (!email || !password || !action) {
        return res.status(400).json({ message: 'Missing required fields: email, password, action' });
    }

    try {
        if (action === 'signup') {
            const [emailCheck] = await promisePool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const username = generateUsername(); // Generate random username

            // Insert the user into the database
            await promisePool.execute(
                `INSERT INTO users (email, username, password, profile_picture) VALUES (?, ?, ?, ?)`,
                [email, username, hashedPassword, profilePic || null]
            );

            return res.status(201).json({ message: 'Signup successful' });

        } else if (action === 'login') {
            const [results] = await promisePool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (results.length === 0) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRATION || '24h' } // Default expiry to 24h if not set
            );

            return res.status(200).json({
                message: 'Login successful',
                userId: user.id,
                username: user.username,
                profile_picture: user.profile_picture,
                token
            });

        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ Helper function to generate a 4-character username
function generateUsername() {
    const words = ["K", "7", "Q", "V", "1", "M", "2", "Z", "9", "S", "0", "X"];
    return Array.from({ length: 4 }, () => words[Math.floor(Math.random() * words.length)]).join("");
}


