import jwt from 'jsonwebtoken';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Middleware to check if JWT token is valid
const authenticateToken = (event) => {
    const authHeader = event.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        console.warn('⛔ No token provided');
        return null;
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        return { user };
    } catch (err) {
        console.error('❌ Invalid or expired token:', err.message);
        return null;
    }
};

export const handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'CORS preflight success' }),
        };
    }

    const result = authenticateToken(event);
    const user = result?.user;

    if (!user) {
        return {
            statusCode: 403,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid or expired token' }),
        };
    }

    // Protected route logic
    if (event.httpMethod === 'GET' || event.httpMethod === 'POST') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: `${event.httpMethod} success - protected route`,
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

