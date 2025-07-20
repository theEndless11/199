const { promisePool: pool } = require('../utils/db');

export default async function handler(req, res) {
  // ✅ Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // ✅ Handle preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // No body for preflight
  }

  try {
    switch (req.method) {
      case 'POST':
        return await createHashtagFeatures(req, res);

      case 'GET':
        const { action } = req.query;
        switch (action) {
          case 'trending':
            return await getTrendingHashtags(req, res);
          case 'search':
            return await searchHashtags(req, res);
          case 'hashtag-posts':
            return await getPostsByHashtag(req, res);
          case 'user-activity':
            return await getUserHashtagActivity(req, res);
          case 'related':
            return await getRelatedHashtags(req, res);
          case 'stats':
            return await getSystemStats(req, res);
          default:
            return await getTrendingHashtags(req, res);
        }

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// === API Route Handlers ===

async function createHashtagFeatures(req, res) {
  const { hashtags, postId, username } = req.body;

  if (!hashtags?.length || !postId || !username) {
    return res.status(400).json({
      error: 'hashtags array, postId, and username are required'
    });
  }

  const connection = await pool.getConnection();
  try {
    const values = hashtags.map(h =>
      [h.toLowerCase().replace('#', '').trim(), postId, username]
    );

    await connection.query(
      'INSERT INTO features (hashtag, post_id, username) VALUES ?',
      [values]
    );

    res.status(201).json({
      success: true,
      message: `Created ${values.length} hashtag features`,
      hashtags: values.map(v => v[0])
    });
  } finally {
    connection.release();
  }
}

async function getTrendingHashtags(req, res) {
  const { period = '7d', limit = 20 } = req.query;

  const hoursMap = { '1h': 1, '24h': 24, '3d': 72, '7d': 168 };
  const selectedHours = hoursMap[period] || 168;

  const connection = await pool.getConnection();
  try {
    const [trending] = await connection.query(`
      SELECT 
        hashtag,
        COUNT(*) as total_uses,
        COUNT(DISTINCT username) as unique_users,
        MAX(created_at) as latest_use,
        MIN(created_at) as first_use,
        ROUND(COUNT(*) / COUNT(DISTINCT username), 1) as avg_uses_per_user
      FROM features 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY hashtag 
      ORDER BY total_uses DESC, unique_users DESC
      LIMIT ?
    `, [selectedHours, parseInt(limit)]);

    res.json({
      success: true,
      period,
      trending_hashtags: trending,
      generated_at: new Date()
    });
  } finally {
    connection.release();
  }
}

async function searchHashtags(req, res) {
  const { q: query, limit = 10 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  const connection = await pool.getConnection();
  try {
    const [results] = await connection.query(`
      SELECT 
        hashtag,
        COUNT(*) as total_uses,
        COUNT(DISTINCT username) as unique_users,
        MAX(created_at) as latest_use
      FROM features 
      WHERE hashtag LIKE CONCAT(?, '%')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY hashtag
      ORDER BY total_uses DESC, latest_use DESC
      LIMIT ?
    `, [query.toLowerCase().replace('#', ''), parseInt(limit)]);

    res.json({
      success: true,
      query,
      results
    });
  } finally {
    connection.release();
  }
}

async function getPostsByHashtag(req, res) {
  const { hashtag, limit = 20, offset = 0 } = req.query;

  if (!hashtag) {
    return res.status(400).json({ error: 'Hashtag parameter required' });
  }

  const connection = await pool.getConnection();
  try {
    const cleanHashtag = hashtag.toLowerCase().replace('#', '');

    const [posts] = await connection.query(`
  SELECT 
    f.id as feature_id,
    f.hashtag,
    f.created_at as tagged_at,
    p._id as post_id,    
    p.message,
    p.username,
    p.photo,
    p.timestamp
  FROM features f
  LEFT JOIN posts p ON f.post_id = p._id    -- <--- FIX HERE
  WHERE f.hashtag = ?
    AND f.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  ORDER BY f.created_at DESC
  LIMIT ? OFFSET ?
`, [cleanHashtag, parseInt(limit), parseInt(offset)]);


    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total
      FROM features 
      WHERE hashtag = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [cleanHashtag]);

    res.json({
      success: true,
      hashtag: `#${cleanHashtag}`,
      posts,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } finally {
    connection.release();
  }
}

async function getUserHashtagActivity(req, res) {
  const { username, limit = 10 } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username parameter required' });
  }

  const connection = await pool.getConnection();
  try {
    const [activity] = await connection.query(`
      SELECT 
        hashtag,
        COUNT(*) as usage_count,
        MAX(created_at) as last_used,
        MIN(created_at) as first_used
      FROM features 
      WHERE username = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY hashtag
      ORDER BY usage_count DESC, last_used DESC
      LIMIT ?
    `, [username, parseInt(limit)]);

    res.json({
      success: true,
      username,
      hashtag_activity: activity
    });
  } finally {
    connection.release();
  }
}

async function getRelatedHashtags(req, res) {
  const { hashtag, limit = 10 } = req.query;

  if (!hashtag) {
    return res.status(400).json({ error: 'Hashtag parameter required' });
  }

  const connection = await pool.getConnection();
  try {
    const cleanHashtag = hashtag.toLowerCase().replace('#', '');

    const [related] = await connection.query(`
      SELECT 
        f2.hashtag as related_hashtag,
        COUNT(*) as co_occurrence_count,
        COUNT(DISTINCT f1.username) as common_users
      FROM features f1
      JOIN features f2 ON f1.post_id = f2.post_id 
        AND f1.hashtag != f2.hashtag
      WHERE f1.hashtag = ?
        AND f1.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY f2.hashtag
      ORDER BY co_occurrence_count DESC
      LIMIT ?
    `, [cleanHashtag, parseInt(limit)]);

    res.json({
      success: true,
      base_hashtag: `#${cleanHashtag}`,
      related_hashtags: related
    });
  } finally {
    connection.release();
  }
}

async function getSystemStats(req, res) {
  const connection = await pool.getConnection();
  try {
    const [overallStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_hashtag_uses,
        COUNT(DISTINCT hashtag) as unique_hashtags,
        COUNT(DISTINCT username) as active_users,
        COUNT(DISTINCT post_id) as posts_with_hashtags
      FROM features 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [dailyStats] = await connection.query(`
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as total_uses,
        COUNT(DISTINCT hashtag) as unique_hashtags,
        COUNT(DISTINCT username) as active_users
      FROM features 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `);

    const [todayTop] = await connection.query(`
      SELECT hashtag, COUNT(*) as uses
      FROM features 
      WHERE DATE(created_at) = CURDATE()
      GROUP BY hashtag
      ORDER BY uses DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      overall_stats: overallStats[0],
      daily_breakdown: dailyStats,
      today_top_hashtags: todayTop,
      generated_at: new Date()
    });
  } finally {
    connection.release();
  }
}

