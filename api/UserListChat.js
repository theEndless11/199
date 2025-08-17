const { promisePool } = require('../utils/db');

// Set common CORS headers
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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Missing post ID in request' });
  }

  try {
    // Fetch post
    const postQuery = `
      SELECT 
        _id, message, timestamp, username, sessionId, 
        likes, likedBy, comments_count, views_count, photo 
      FROM posts 
      WHERE _id = ?
    `;
    const [postResults] = await promisePool.execute(postQuery, [id]);

    if (postResults.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = postResults[0];

    // Fetch comments for the post (top-level only)
    const commentsQuery = `
      SELECT 
        comment_id, parent_comment_id, username, comment_text, created_at, hearts_count 
      FROM comments 
      WHERE post_id = ? AND is_deleted = FALSE
      ORDER BY created_at ASC
    `;
    const [commentResults] = await promisePool.execute(commentsQuery, [id]);

    const formattedComments = commentResults.map(comment => ({
      commentId: comment.comment_id,
      parentCommentId: comment.parent_comment_id,
      username: comment.username,
      commentText: comment.comment_text,
      createdAt: comment.created_at,
      hearts: comment.hearts_count,
    }));

    const formattedPost = {
      _id: post._id,
      message: post.message,
      timestamp: post.timestamp,
      username: post.username,
      sessionId: post.sessionId,
      likes: post.likes,
      views_count: post.views_count || 0,
      likedBy: post.likedBy ? JSON.parse(post.likedBy || '[]') : [],
      commentCount: post.comments_count || formattedComments.length,
      comments: formattedComments,
      photo: post.photo
        ? (post.photo.startsWith('http') || post.photo.startsWith('data:image/')
            ? post.photo
            : `data:image/jpeg;base64,${post.photo.toString('base64')}`)
        : null,
    };

    return res.status(200).json({ post: formattedPost });
  } catch (error) {
    console.error('❌ Error fetching post and comments:', error);
    return res.status(500).json({ message: 'Error retrieving post and comments', error });
  }
};

module.exports = handler;



