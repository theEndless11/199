import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { promisePool } from '../utils/db';

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

// Helper: validate expiration value (e.g., "30d", "60", "15m")
const getSafeExpiration = () => {
    const exp = process.env.JWT_EXPIRATION;
    const isValid = exp && /^\d+[smhd]?$/.test(exp);
    return isValid ? exp : '24h'; // default fallback
};

export default async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return handlePreflight(req, res);
    }

    const { email, password, action, username, profilePic } = req.body;

    if (!email || !password || !action) {
        return res.status(400).json({ message: 'Missing required fields: email, password, action' });
    }

  if (action === 'signup' && (!username || !profilePic)) {
    return res.status(400).json({ message: 'Username and profile picture are required for signup' });
}

try {
    if (action === 'signup') {
        const [emailCheck] = await promisePool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (emailCheck.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Extract location data from request
     
        const country = req.body.country || 'Unknown';
        const city = req.body.city || 'Unknown';
        
        // Get current timestamp for created_at
        const createdAt = new Date();
        
        await promisePool.execute(
            `INSERT INTO users (email, username, password, profile_picture, country, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [email, username, hashedPassword, profilePic, country, city, createdAt]
        );
        
        return res.status(201).json({ 
            message: 'Signup successful',
            location: country
        });
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

            const token = jwt.sign(
                { userId: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: getSafeExpiration() }
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
        console.error('💥 Server error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
