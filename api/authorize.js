import jwt from 'jsonwebtoken';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Middleware to check if JWT token is valid
const authenticateToken = (req) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

    if (!token) {
        return null; // Let the handler handle 403
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        return { user };
    } catch (err) {
        return null;
    }
};

// Serverless function
export const handler = async (event) => {
    // ✅ Handle CORS preflight request (OPTIONS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'CORS preflight success' }),
        };
    }

    // ✅ Auth check for other requests
    const result = authenticateToken(event);
    const user = result && result.user;

    if (!user) {
        return {
            statusCode: 403,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid or expired token' }),
        };
    }

    // ✅ Protected route logic
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'This is a protected route',
                user,
            }),
        };
    }

    return {
        statusCode: 405,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Method not allowed' }),
    };
};

