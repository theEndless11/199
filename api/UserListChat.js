const { promisePool } = require('../utils/db');

const defaultPfp = 'data:image/svg+xml;base64,...'; // Replace with actual default pic

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const handler = async (req, res) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing post ID' });

  try {
    // Fetch post and comments
    const [[postResults], [commentResults]] = await Promise.all([
      promisePool.execute(`
        SELECT _id, message, timestamp, username, sessionId, 
               likes, likedBy, comments_count, views_count, photo 
        FROM posts WHERE _id = ?
      `, [id]),
      promisePool.execute(`
        SELECT 
          c.comment_id, c.parent_comment_id, c.username, c.comment_text, 
          c.created_at, c.updated_at, COUNT(ch.id) AS hearts_count
        FROM comments c
        LEFT JOIN comment_hearts ch ON c.comment_id = ch.comment_id
        WHERE c.post_id = ?
        GROUP BY c.comment_id
        ORDER BY c.created_at ASC
        LIMIT 200
      `, [id])
    ]);

    if (!postResults.length) return res.status(404).json({ message: 'Post not found' });

    const post = postResults[0];

    // Collect all unique usernames (post + comments)
    const usernamesSet = new Set();
    usernamesSet.add(post.username.toLowerCase());
    commentResults.forEach(c => usernamesSet.add(c.username.toLowerCase()));
    const usernames = Array.from(usernamesSet);

    // Fetch user profile pictures
    const usersMap = {};
    if (usernames.length > 0) {
      const placeholders = usernames.map(() => '?').join(',');
      const [users] = await promisePool.execute(
        `SELECT username, profile_picture FROM users WHERE LOWER(username) IN (${placeholders})`,
        usernames
      );

      users.forEach(({ username, profile_picture }) => {
        const key = username.toLowerCase();
        const pic = profile_picture
          ? (profile_picture.startsWith('data:image') ? profile_picture : `data:image/jpeg;base64,${profile_picture}`)
          : defaultPfp;
        usersMap[key] = pic;
      });
    }

    // Normalize and structure comments
    const allComments = commentResults.map(c => ({
      commentId: c.comment_id,
      parentCommentId: c.parent_comment_id || null,
      username: c.username,
      profilePicture: usersMap[c.username.toLowerCase()] || defaultPfp,
      commentText: c.comment_text,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      hearts: parseInt(c.hearts_count) || 0,
      replies: []
    }));

    // Separate top-level comments and replies
    const commentMap = new Map();
    const topLevelComments = [];

    allComments.forEach(comment => {
      commentMap.set(comment.commentId, comment);
      if (!comment.parentCommentId) {
        topLevelComments.push(comment);
      }
    });

    allComments.forEach(comment => {
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        parent ? parent.replies.push(comment) : topLevelComments.push(comment); // Orphan fallback
      }
    });

    // Sort replies for each comment
    topLevelComments.forEach(c => {
      if (c.replies.length > 1) {
        c.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
    });

    // Final post structure
    const formattedPost = {
      _id: post._id,
      message: post.message,
      timestamp: post.timestamp,
      username: post.username,
      profilePicture: usersMap[post.username.toLowerCase()] || defaultPfp,
      sessionId: post.sessionId,
      likes: post.likes || 0,
      views_count: post.views_count || 0,
      likedBy: post.likedBy ? JSON.parse(post.likedBy) : [],
      commentCount: post.comments_count || allComments.length,
      comments: topLevelComments,
      photo: post.photo
        ? (post.photo.startsWith('http') || post.photo.startsWith('data:image/')
            ? post.photo
            : `data:image/jpeg;base64,${post.photo}`)
        : null
    };

    return res.status(200).json({ post: formattedPost });

  } catch (err) {
    console.error('❌ Error fetching post and comments:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = handler;

