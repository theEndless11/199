import jwt from 'jsonwebtoken';

// Middleware to check if JWT token is valid
const authenticateToken = (req) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

    if (!token) {
        return { statusCode: 403, body: JSON.stringify({ message: 'Access denied, no token provided' }) };
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        return { user };
    } catch (err) {
        return { statusCode: 403, body: JSON.stringify({ message: 'Invalid or expired token' }) };
    }
};

// Serverless function
export const handler = async (event) => {
    const { user } = authenticateToken(event);  // Validate JWT token

    // If authentication failed (no user)
    if (!user) {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Invalid or expired token' }),
            headers: {
                'Access-Control-Allow-Origin': '*',  // Allow all origins
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        };
    }

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',  // Allow all origins
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Your protected route logic
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'This is a protected route',
                user: user,  // Send user data back
            }),
            headers,
        };
    }

    return {
        statusCode: 405,  // Method not allowed
        body: JSON.stringify({ message: 'Method not allowed' }),
        headers,
    };
};
