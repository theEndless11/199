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

// Get replies for a parent comment
const getCommentReplies = async (parentCommentId, postId) => {
  const [replies] = await promisePool.execute(
    'SELECT comment_id, username, comment_text, created_at FROM comments WHERE parent_comment_id = ? AND post_id = ? ORDER BY created_at ASC',
    [parentCommentId, postId]
  );

  // Get hearts for each reply
  const repliesWithHearts = await Promise.all(
    replies.map(async (reply) => {
      const hearts = await getCommentHearts(reply.comment_id);
      return {
        ...reply,
        hearts,
        heartCount: hearts.length
      };
    })
  );

  return repliesWithHearts;
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
        const [hearts, replies] = await Promise.all([
          getCommentHearts(comment.comment_id),
          getCommentReplies(comment.comment_id, postId)
        ]);

        return {
          ...comment,
          hearts,
          heartCount: hearts.length,
          replies,
          replyCount: replies.length
        };
      })
    );

    return commentsWithDetails;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

// Get comments with pagination
const getPostCommentsWithPagination = async (postId, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    // Get total count of top-level comments
    const [countResult] = await promisePool.execute(
      'SELECT COUNT(*) as total FROM comments WHERE post_id = ? AND parent_comment_id IS NULL',
      [postId]
    );
    const totalComments = countResult[0].total;

    // Get paginated top-level comments
    const [comments] = await promisePool.execute(
      'SELECT comment_id, username, comment_text, created_at FROM comments WHERE post_id = ? AND parent_comment_id IS NULL ORDER BY created_at ASC LIMIT ? OFFSET ?',
      [postId, limit, offset]
    );

    // Get hearts and replies for each comment
    const commentsWithDetails = await Promise.all(
      comments.map(async (comment) => {
        const [hearts, replies] = await Promise.all([
          getCommentHearts(comment.comment_id),
          getCommentReplies(comment.comment_id, postId)
        ]);

        return {
          ...comment,
          hearts,
          heartCount: hearts.length,
          replies,
          replyCount: replies.length
        };
      })
    );

    return {
      comments: commentsWithDetails,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        hasNextPage: page < Math.ceil(totalComments / limit),
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error fetching paginated comments:', error);
    throw error;
  }
};



// Main handler
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  setCorsHeaders(res);

  if (req.method === 'GET') {
    const { postId, page, limit } = req.query;

    try {
      // Get comments for a post
      if (postId) {
        // Check if pagination is requested
        if (page || limit) {
          const pageNum = parseInt(page) || 1;
          const limitNum = parseInt(limit) || 10;
          const result = await getPostCommentsWithPagination(postId, pageNum, limitNum);
          return res.status(200).json(result);
        } else {
          // Get all comments without pagination
          const comments = await getPostComments(postId);
          return res.status(200).json({ comments });
        }
      }

      return res.status(400).json({ message: 'postId is required' });
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



