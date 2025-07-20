const { promisePool } = require('../utils/db');
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key])
    })
    return res.status(200).end()
  }

  // Set CORS headers for all requests
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key])
  })

  let connection
  try {
    connection = await mysql.createConnection(dbConfig)
    
    switch (req.method) {
      case 'POST':
        return await createHashtagEntries(req, res, connection)
      case 'GET':
        return await getTrendingHashtags(req, res, connection)
      case 'DELETE':
        return await deleteOldHashtags(req, res, connection)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Database error:', error)
    return res.status(500).json({ error: 'Database connection failed' })
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Create hashtag entries for a post
async function createHashtagEntries(req, res, connection) {
  try {
    const { postId, hashtags, username, profilePic } = req.body

    if (!postId || !hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return res.status(400).json({ error: 'Invalid input: postId and hashtags array required' })
    }

    // Create table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trending_hashtags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hashtag VARCHAR(100) NOT NULL,
        post_id VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        profile_pic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
        INDEX idx_hashtag (hashtag),
        INDEX idx_created_at (created_at),
        INDEX idx_expires_at (expires_at)
      )
    `)

    // Insert hashtag entries
    const values = hashtags.map(hashtag => [
      hashtag.toLowerCase(),
      postId,
      username,
      profilePic || null
    ])

    const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ')
    const flatValues = values.flat()

    const [result] = await connection.execute(
      `INSERT INTO trending_hashtags (hashtag, post_id, username, profile_pic) VALUES ${placeholders}`,
      flatValues
    )
    
    return res.status(201).json({
      message: 'Hashtag entries created successfully',
      insertedCount: result.affectedRows,
      insertedId: result.insertId
    })
  } catch (error) {
    console.error('Error creating hashtag entries:', error)
    return res.status(500).json({ error: 'Failed to create hashtag entries' })
  }
}

// Get trending hashtags with counts and recent posts
async function getTrendingHashtags(req, res, connection) {
  try {
    const { hours = 24, limit = 20 } = req.query
    
    // Get trending hashtags with counts
    const [trendingResults] = await connection.execute(`
      SELECT 
        hashtag,
        COUNT(*) as count,
        COUNT(DISTINCT username) as unique_user_count,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen,
        (COUNT(*) * COUNT(DISTINCT username)) as trending_score
      FROM trending_hashtags 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND expires_at > NOW()
      GROUP BY hashtag 
      ORDER BY trending_score DESC, count DESC
      LIMIT ?
    `, [parseInt(hours), parseInt(limit)])

    // Get recent posts for each trending hashtag
    const hashtagsWithPosts = await Promise.all(
      trendingResults.map(async (hashtag) => {
        const [recentPosts] = await connection.execute(`
          SELECT post_id, username, profile_pic, created_at
          FROM trending_hashtags 
          WHERE hashtag = ? 
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            AND expires_at > NOW()
          ORDER BY created_at DESC 
          LIMIT 3
        `, [hashtag.hashtag, parseInt(hours)])

        return {
          ...hashtag,
          recent_posts: recentPosts
        }
      })
    )
    
    return res.status(200).json({
      trending_hashtags: hashtagsWithPosts,
      period_hours: parseInt(hours),
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting trending hashtags:', error)
    return res.status(500).json({ error: 'Failed to get trending hashtags' })
  }
}

// Delete old hashtags (cleanup function)
async function deleteOldHashtags(req, res, connection) {
  try {
    const [result] = await connection.execute(`
      DELETE FROM trending_hashtags 
      WHERE expires_at <= NOW()
    `)
    
    return res.status(200).json({
      message: 'Old hashtag entries deleted successfully',
      deletedCount: result.affectedRows
    })
  } catch (error) {
    console.error('Error deleting old hashtags:', error)
    return res.status(500).json({ error: 'Failed to delete old hashtags' })
  }
}

// Additional endpoint to get specific hashtag details
export async function getHashtagDetails(req, res, connection) {
  try {
    const { hashtag } = req.query
    
    if (!hashtag) {
      return res.status(400).json({ error: 'Hashtag parameter required' })
    }

    const [results] = await connection.execute(`
      SELECT 
        post_id,
        username,
        profile_pic,
        created_at,
        hashtag
      FROM trending_hashtags 
      WHERE hashtag = ? 
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `, [hashtag.toLowerCase()])
    
    const [countResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(DISTINCT username) as unique_users,
        MIN(created_at) as first_used,
        MAX(created_at) as last_used
      FROM trending_hashtags 
      WHERE hashtag = ? 
        AND expires_at > NOW()
    `, [hashtag.toLowerCase()])
    
    return res.status(200).json({
      hashtag: hashtag.toLowerCase(),
      posts: results,
      statistics: countResult[0]
    })
  } catch (error) {
    console.error('Error getting hashtag details:', error)
    return res.status(500).json({ error: 'Failed to get hashtag details' })
  }
}

module.exports = handler;
