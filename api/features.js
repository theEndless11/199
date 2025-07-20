const { promisePool } = require('../utils/db');
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).end();
  }

  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    await createHashtagsTable(connection);

    switch (req.method) {
      case 'POST':
        return await createHashtagEntries(req, res, connection);
      case 'GET':
        return await getTrendingHashtags(req, res, connection);
      case 'DELETE':
        return await deleteOldHashtags(req, res, connection);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  } finally {
    if (connection) await connection.end();
  }
}

async function createHashtagEntries(req, res, connection) {
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

    const [result] = await connection.execute(
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

async function getTrendingHashtags(req, res, connection) {
  try {
    const { hours = 24, limit = 20 } = req.query;

    const [trendingResults] = await connection.execute(
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
        const [recentPosts] = await connection.execute(
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

async function deleteOldHashtags(req, res, connection) {
  try {
    const [result] = await connection.execute(
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
