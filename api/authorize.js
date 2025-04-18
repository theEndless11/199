import jwt from 'jsonwebtoken';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Middleware to check if JWT token is valid
const authenticateToken = (event) => {
    const token = event.headers?.authorization?.split(' ')[1];
    if (!token) return null;

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        return { user };
    } catch (err) {
        return null;
    }
};

// Serverless function
export const handler = async (event) => {
    // CORS preflight
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

    // Handle GET request
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'GET success - protected route',
                user,
            }),
        };
    }

    // Handle POST request
    if (event.httpMethod === 'POST') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'POST success - protected route',
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

