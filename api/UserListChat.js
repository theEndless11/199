const { promisePool } = require('../utils/db');

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

const handler = async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      return res.status(204).end();
    }

    setCorsHeaders(res);

    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Parse query params from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const limit = parseInt(url.searchParams.get('limit')) || 6;

    console.time("DB Query");
    const [users] = await promisePool.execute(
      'SELECT id, username, COALESCE(profile_picture, ?) as profile_picture FROM users LIMIT ? OFFSET ?',
      ['https://latestnewsandaffairs.site/public/pfp2.jpg', limit, offset]
    );
    console.timeEnd("DB Query");

    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

module.exports = handler;




