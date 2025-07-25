const { promisePool } = require('../utils/db');

const allowedOrigins = ['http://localhost:5173', 'https://latestnewsandaffairs.site'];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}


async function handler(req, res) {
  setCorsHeaders(req, res); // ✅ Apply CORS headers on all requests

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // ✅ Preflight response
  }

  try {
    switch (req.method) {
      case 'POST':
        return await createHashtagEntries(req, res);
      case 'GET':
        return await getTrendingHashtags(req, res);
      case 'DELETE':
        return await deleteOldHashtags(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


async function createHashtagEntries(req, res) {
  try {
    const { postId, hashtags, username } = req.body;

    if (!postId || !hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return res.status(400).json({ error: 'Invalid input: postId and hashtags array required' });
    }

    const values = hashtags.map(hashtag => [
      hashtag.toLowerCase(),
      postId,
      username
    ]);

    const placeholders = values.map(() => '(?, ?, ?)').join(', ');
    const flatValues = values.flat();

    const [result] = await promisePool.execute(
      `INSERT INTO hashtags (hashtag, post_id, username) VALUES ${placeholders}`,
      flatValues
    );

    return res.status(201).json({
      message: 'Hashtag entries created successfully',
      insertedCount: result.affectedRows,
      insertedId: result.insertId
    });
  } catch (error) {
    console.error('Error creating hashtag entries:', error);
    return res.status(500).json({ error: 'Failed to create hashtag entries' });
  }
}

async function getTrendingHashtags(req, res) {
  try {
    const { hours = 24, limit = 20 } = req.query;

    const [trendingResults] = await promisePool.execute(
      `
      SELECT 
        hashtag,
        COUNT(*) as count,
        COUNT(DISTINCT username) as unique_user_count,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen,
        (COUNT(*) * COUNT(DISTINCT username)) as trending_score
      FROM hashtags
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND expires_at > NOW()
      GROUP BY hashtag
      ORDER BY trending_score DESC, count DESC
      LIMIT ?
      `,
      [parseInt(hours), parseInt(limit)]
    );

    // Fetch recent posts joined with user profile_picture from users table
    const hashtagsWithPosts = await Promise.all(
      trendingResults.map(async (hashtag) => {
        const [recentPosts] = await promisePool.execute(
          `
          SELECT 
            h.post_id, 
            h.username, 
            u.profile_picture, 
            h.created_at
          FROM hashtags h
          LEFT JOIN users u ON h.username = u.username
          WHERE h.hashtag = ?
            AND h.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            AND h.expires_at > NOW()
          ORDER BY h.created_at DESC
          LIMIT 3
          `,
          [hashtag.hashtag, parseInt(hours)]
        );

        return {
          ...hashtag,
          recent_posts: recentPosts
        };
      })
    );

    return res.status(200).json({
      trending_hashtags: hashtagsWithPosts,
      period_hours: parseInt(hours),
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting trending hashtags:', error);
    return res.status(500).json({ error: 'Failed to get trending hashtags' });
  }
}

async function deleteOldHashtags(req, res) {
  try {
    const [result] = await promisePool.execute(
      `DELETE FROM hashtags WHERE expires_at <= NOW()`
    );

    return res.status(200).json({
      message: 'Old hashtag entries deleted successfully',
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting old hashtags:', error);
    return res.status(500).json({ error: 'Failed to delete old hashtags' });
  }
}

module.exports = handler;
