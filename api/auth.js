const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db'); // Ensure this is promisePool from db.js

module.exports = async (req, res) => {
    const { username, password, action } = req.body;

    // Check if required fields are provided
    if (!username || !password || !action) {
        return res.status(400).json({ message: 'Missing required fields: username, password, action' });
    }

    try {
        if (action === 'signup') {
            // Signup logic
            const [results] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);

            if (results.length > 0) {
                return res.status(400).json({ message: 'Username already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Save new user to DB
            await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

            return res.status(201).json({ message: 'Signup successful' });

        } else if (action === 'login') {
            // Login logic
            const [results] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);

            if (results.length === 0) {
                return res.status(401).json({ message: 'Incorrect username or password' });
            }

            const user = results[0];

            // Compare password with hashed password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                console.error('Password mismatch for user:', username); // Log for debugging
                return res.status(401).json({ message: 'Incorrect username or password' });
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

