const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db'); // Ensure this is promisePool from db.js

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

module.exports = async (req, res) => {
    setCorsHeaders(req, res);  

    if (req.method === 'OPTIONS') {
        return handlePreflight(req, res);  
    }

    const { email, password, action } = req.body;

    if (!email || !password || !action) {
        return res.status(400).json({ message: 'Missing required fields: email, password, action' });
    }

    try {
        if (action === 'signup') {
            const [emailCheck] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const username = generateUsername();

            await pool.execute('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword]);

            return res.status(201).json({ message: 'Signup successful' });

        } else if (action === 'login') { // ✅ Fixed indentation and structure
            const [results] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (results.length === 0) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            const user = results[0]; // Get the user from the database
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            try {
                const token = jwt.sign(
                    { userId: user.id },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRATION }
                );

                // Include username in the response
                return res.status(200).json({
                    message: 'Login successful',
                    userId: user.id,
                    username: user.username, // Include username
                    token
                });

            } catch (jwtError) {
                return res.status(500).json({ message: 'JWT generation failed' });
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
};

// Helper function to generate a 4-character username
function generateUsername() {
    const words = ["K", "7", "Q", "V", "1", "M", "2", "Z", "9", "S", "0", "X"];
    return Array.from({ length: 4 }, () => words[Math.floor(Math.random() * words.length)]).join("");
}

