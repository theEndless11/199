const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db'); // Ensure this is promisePool from db.js

// Set CORS headers for all methods
const setCorsHeaders = (req, res) => {
    // Allow all origins for now
    res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');  // Allowed methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');  // Allowed headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');  // Allow credentials (if needed)
};

// Handle OPTIONS requests for CORS pre-flight
const handlePreflight = (req, res) => {
    res.status(200).end();  // Respond immediately for pre-flight (OPTIONS)
};

module.exports = async (req, res) => {
    setCorsHeaders(req, res);  // Set CORS headers
    
    // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return handlePreflight(req, res);  // Handle pre-flight request
    }

    const { email, username, password, action } = req.body;

    // Check if required fields are provided
    if (!email || !username || !password || !action) {
        return res.status(400).json({ message: 'Missing required fields: email, username, password, action' });
    }

    try {
        if (action === 'signup') {
            // Signup logic
            // Check if email already exists in the database
            const [emailCheck] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            // Check if username already exists in the database
            const [usernameCheck] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);

            if (usernameCheck.length > 0) {
                return res.status(400).json({ message: 'Username already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Save new user to DB with email, username, and password
            const [insertResult] = await pool.execute('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword]);

            const userId = insertResult.insertId;  // Retrieve the generated user ID after insertion

            // Return the userId along with the success message
            return res.status(201).json({ message: 'Signup successful', userId });

        } else if (action === 'login') {
            // Login logic
            // Check if the email exists in the database
            const [results] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (results.length === 0) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            const user = results[0];

            // Compare password with hashed password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                console.error('Password mismatch for user:', email); // Log for debugging
                return res.status(401).json({ message: 'Incorrect email or password' });
            }

            try {
                // Generate JWT Token
                const token = jwt.sign(
                    { userId: user.id },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRATION }
                );

                console.log('JWT Token generated:', token); // Log the token for debugging
                return res.status(200).json({ message: 'Login successful', userId: user.id, token });

            } catch (jwtError) {
                console.error('JWT Signing Error:', jwtError);
                return res.status(500).json({ message: 'JWT generation failed' });
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }
    } catch (err) {
        console.error('Error during authentication:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};
