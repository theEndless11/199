import jwt from 'jsonwebtoken';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const authenticateToken = (event) => {
    const authHeader = event.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    console.log('🔐 Authorization Header:', authHeader);
    console.log('🔑 Token Extracted:', token);
    console.log('🧪 JWT_SECRET present:', !!process.env.JWT_SECRET);

    if (!token) {
        console.warn('⛔ No token provided');
        return null;
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token verified. User:', user);
        return { user };
    } catch (err) {
        console.error('❌ Invalid or expired token:', err.message);
        return null;
    }
};

export const handler = async (event) => {
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

    // You can allow more methods here if needed
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

