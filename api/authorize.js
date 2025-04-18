import jwt from 'jsonwebtoken';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const authenticateToken = (req) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) return null;

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        return { user };
    } catch (err) {
        return null;
    }
};

// ✅ Vercel-compliant default export
export default async function handler(req, res) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // Auth check
    const result = authenticateToken(req);
    const user = result?.user;

    if (!user) {
        res.writeHead(403, CORS_HEADERS);
        return res.end(JSON.stringify({ message: 'Invalid or expired token' }));
    }

    // Success
    res.writeHead(200, CORS_HEADERS);
    return res.end(JSON.stringify({
        message: 'Token valid',
        user,
    }));
}


