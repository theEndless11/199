const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db'); // Import the pool from db.js

const router = express.Router();

// Signup and Login route (combined)
router.post('/', async (req, res) => {
  const { username, password, action } = req.body;  // Get the action type (login/signup)

  console.log('Received request:', { username, action });  // Log request for debugging

  if (action === 'signup') {
    try {
      // Check if username already exists
      const [results] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

      if (results.length > 0) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save new user to DB
      await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

      res.status(201).json({ message: 'Signup successful' });

    } catch (err) {
      console.error('Error during signup:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  } else if (action === 'login') {
    try {
      const [results] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

      if (results.length === 0) {
        return res.status(401).json({ message: 'Incorrect username or password' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect username or password' });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });

      res.status(200).json({ message: 'Login successful', userId: user.id, token });

    } catch (err) {
      console.error('Error during login:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  } else {
    res.status(400).json({ message: 'Invalid action' });
  }
});

module.exports = router;
