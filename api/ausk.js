const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db'); // Ensure this is promisePool from db.js

// Set CORS headers for all methods
const setCorsHeaders = (req, res) => {
    // For development, allow all origins (use *). For production, replace * with specific domain names.
    res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins for now. Change '*' to a specific domain for production.
    
    // Allow specific HTTP methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');  // Allowed methods
    
    // Allow specific headers for the CORS request
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');  // Allowed headers
    
    // Allow credentials if needed (cookies, authorization headers, etc.)
    res.setHeader('Access-Control-Allow-Credentials', 'true');  // Allow credentials (cookies or HTTP authentication)
};

// Handle pre-flight OPTIONS requests (CORS)
const handlePreflight = (req, res) => {
    res.status(200).end();  // Respond immediately with 200 OK for OPTIONS (pre-flight request)
};

module.exports = async (req, res) => {
    setCorsHeaders(req, res);  // Set CORS headers for the response
    
    // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return handlePreflight(req, res);  // Handle pre-flight OPTIONS requests properly
    }

    const { email, password, action } = req.body;

    // Check if required fields are provided
    if (!email || !password || !action) {
        return res.status(400).json({ message: 'Missing required fields: email, password, action' });
    }

    try {
        if (action === 'signup') {
            // Signup logic
            const [emailCheck] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            const username = generateUsername();

            const [insertResult] = await pool.execute('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword]);

            return res.status(201).json({ message: 'Signup successful' });

        } else if (action === 'login') {
            // Login logic
            const [results] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (results.length === 0) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            const user = results[0];

            // Compare password with hashed password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            try {
                // Generate JWT Token
                const token = jwt.sign(
                    { userId: user.id },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRATION }
                );

                return res.status(200).json({ message: 'Login successful', userId: user.id, token });

            } catch (jwtError) {
                return res.status(500).json({ message: 'JWT generation failed' });
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
}

// Helper function to generate a 4-word username
function generateUsername() {
    const words = ["K", "7", "Q", "V", "1", "M", "2", "Z", "9", "S", "0", "X"];
    const randomWords = [];
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        randomWords.push(words[randomIndex]);
    }
    return randomWords.join("");
}

