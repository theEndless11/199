import jwt from 'jsonwebtoken';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ✅ Safe token generator with fallback expiration
const DEFAULT_EXPIRATION = '30d'; // fallback if JWT_EXPIRATION is invalid

const generateToken = (payload) => {
    const isValidFormat = (exp) => /^\d+[smhd]?$/.test(exp); // e.g., 60, 15m, 2d

    const expiresIn = isValidFormat(process.env.JWT_EXPIRATION)
        ? process.env.JWT_EXPIRATION
        : DEFAULT_EXPIRATION;

    console.log('📦 Using expiresIn:', expiresIn);

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// ✅ Auth middleware
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

// ✅ Main serverless function
export const handler = async (event) => {
    // Handle preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'CORS preflight success' }),
        };
    }

    // For testing/demo: issue a token on POST with dummy user
    if (event.httpMethod === 'POST' && event.path === '/api/issue-token') {
        const dummyUser = { id: '123', username: 'testuser' };
        const token = generateToken(dummyUser);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Token issued',
                token,
                user: dummyUser,
            }),
        };
    }

    // 🔐 Authenticate token
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

