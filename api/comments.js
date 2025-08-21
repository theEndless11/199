const { promisePool } = require('../utils/db');

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

// Get hearts for a comment
const getCommentHearts = async (commentId) => {
  const [hearts] = await promisePool.execute(
    'SELECT username FROM comment_hearts WHERE comment_id = ?',
    [commentId]
  );
  return hearts.map(heart => heart.username);
};

// Get all comments for a post with their hearts and replies
const getPostComments = async (postId) => {
  try {
    // Get all top-level comments (no parent_comment_id)
    const [comments] = await promisePool.execute(
      'SELECT comment_id, username, comment_text, created_at FROM comments WHERE post_id = ? AND parent_comment_id IS NULL ORDER BY created_at ASC',
      [postId]
    );

    // Get hearts and replies for each comment
    const commentsWithDetails = await Promise.all(
      comments.map(async (comment) => {
        // Get hearts for this comment
        const hearts = await getCommentHearts(comment.comment_id);
        
        // Get replies for this comment
        const [replies] = await promisePool.execute(
          'SELECT comment_id, username, comment_text, created_at FROM comments WHERE parent_comment_id = ? AND post_id = ? ORDER BY created_at ASC',
          [comment.comment_id, postId]
        );

        // Get hearts for each reply
        const repliesWithHearts = await Promise.all(
          replies.map(async (reply) => {
            const replyHearts = await getCommentHearts(reply.comment_id);
            return {
              ...reply,
              hearts: replyHearts,
              heartCount: replyHearts.length
            };
          })
        );

        return {
          ...comment,
          hearts,
          heartCount: hearts.length,
          replies: repliesWithHearts,
          replyCount: repliesWithHearts.length
        };
      })
    );

    return commentsWithDetails;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

// Main handler - simplified to only handle single post comments
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  setCorsHeaders(res);

  if (req.method === 'GET') {
    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ message: 'postId is required' });
    }

    try {
      const comments = await getPostComments(postId);
      return res.status(200).json({ comments });
    } catch (error) {
      console.error('Error in comments API:', error);
      return res.status(500).json({ 
        message: 'Error fetching comments', 
        error: error.message 
      });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
};



