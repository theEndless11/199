const { promisePool } = require('../utils/db');

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const defaultPfp = 'data:image/svg+xml;base64,...'; // Your default profile pic base64 string here

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
    console.log('[DEBUG] Fetching post and comments for ID:', id);
    
    const postQuery = `
      SELECT 
        _id, message, timestamp, username, sessionId, 
        likes, likedBy, comments_count, views_count, photo 
      FROM posts 
      WHERE _id = ?
    `;

    // FIXED: Updated query to properly calculate hearts count from comment_hearts table
    const commentsQuery = `
      SELECT 
        c.comment_id, 
        c.parent_comment_id, 
        c.username, 
        c.comment_text, 
        c.created_at, 
        c.updated_at,
        COUNT(ch.id) as hearts_count
      FROM comments c
      LEFT JOIN comment_hearts ch ON c.comment_id = ch.comment_id
      WHERE c.post_id = ?
      GROUP BY c.comment_id, c.parent_comment_id, c.username, c.comment_text, c.created_at, c.updated_at
      ORDER BY c.created_at ASC
      LIMIT 200
    `;

    console.time('fetchPostAndComments');
    // Run queries in parallel
    const [[postResults], [commentResults]] = await Promise.all([
      promisePool.execute(postQuery, [id]),
      promisePool.execute(commentsQuery, [id]),
    ]);
    console.timeEnd('fetchPostAndComments');

    console.log('[DEBUG] Found', commentResults.length, 'comments');
    console.log('[DEBUG] Comment details:', commentResults.map(c => ({
      comment_id: c.comment_id,
      parent_comment_id: c.parent_comment_id,
      username: c.username,
      comment_text: c.comment_text?.substring(0, 30) + '...',
      hearts_count: c.hearts_count
    })));

    if (postResults.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = postResults[0];

    // Collect unique usernames
    const usernamesSet = new Set();
    usernamesSet.add(post.username.toLowerCase());
    commentResults.forEach(c => usernamesSet.add(c.username.toLowerCase()));
    const usernames = Array.from(usernamesSet);

    let usersMap = {};
    if (usernames.length > 0) {
      // Fetch profile pictures
      const placeholders = usernames.map(() => '?').join(',');
      const usersQuery = `
        SELECT username, profile_picture 
        FROM users 
        WHERE LOWER(username) IN (${placeholders})
      `;
      console.time('fetchUsers');
      const [users] = await promisePool.execute(usersQuery, usernames);
      console.timeEnd('fetchUsers');

      users.forEach(u => {
        let pic = u.profile_picture;
        if (!pic) {
          pic = defaultPfp;
        } else if (!pic.startsWith('data:image')) {
          pic = `data:image/jpeg;base64,${pic}`;
        }
        usersMap[u.username.toLowerCase()] = pic;
      });
    }

    // FIXED: Format comments and structure replies with proper parent_comment_id handling
    const allComments = commentResults.map(comment => {
      // Normalize parent_comment_id - handle various null representations
      let parentCommentId = comment.parent_comment_id;
      if (!parentCommentId || 
          parentCommentId === '*NULL*' || 
          parentCommentId === 'NULL' || 
          parentCommentId === null || 
          parentCommentId === 'null') {
        parentCommentId = null;
      }

      return {
        commentId: comment.comment_id,
        parentCommentId: parentCommentId,
        username: comment.username,
        profilePicture: usersMap[comment.username.toLowerCase()] || defaultPfp,
        commentText: comment.comment_text,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        hearts: parseInt(comment.hearts_count) || 0, // FIXED: Properly parse hearts count
        replies: []
      };
    });

    console.log('[DEBUG] Formatted comments:', allComments.map(c => ({
      commentId: c.commentId,
      parentCommentId: c.parentCommentId,
      username: c.username,
      isReply: c.parentCommentId !== null,
      hearts: c.hearts
    })));

    const commentsMap = new Map();
    allComments.forEach(comment => commentsMap.set(comment.commentId, comment));

    const topLevelComments = [];
    const replies = [];

    // FIXED: Better separation of top-level comments and replies
    allComments.forEach(comment => {
      if (comment.parentCommentId === null) {
        topLevelComments.push(comment);
      } else {
        replies.push(comment);
      }
    });

    console.log('[DEBUG] Top level comments:', topLevelComments.length);
    console.log('[DEBUG] Replies:', replies.length);

    // FIXED: Attach replies to their parent comments with better error handling
    replies.forEach(reply => {
      const parent = commentsMap.get(reply.parentCommentId);
      if (parent) {
        parent.replies.push(reply);
        console.log('[DEBUG] Attached reply', reply.commentId, 'to parent', parent.commentId);
      } else {
        // If parent not found, treat as orphaned reply and add to top level
        console.warn('[DEBUG] Orphaned reply found:', reply.commentId, 'parent:', reply.parentCommentId);
        reply.parentCommentId = null;
        topLevelComments.push(reply);
      }
    });

    // Sort replies by creation time
    topLevelComments.forEach(comment => {
      if (comment.replies.length > 0) {
        comment.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        console.log('[DEBUG] Comment', comment.commentId, 'has', comment.replies.length, 'replies');
      }
    });

    const formattedPost = {
      _id: post._id,
      message: post.message,
      timestamp: post.timestamp,
      username: post.username,
      profilePicture: usersMap[post.username.toLowerCase()] || defaultPfp,
      sessionId: post.sessionId,
      likes: post.likes || 0,
      views_count: post.views_count || 0,
      likedBy: post.likedBy ? JSON.parse(post.likedBy || '[]') : [],
      commentCount: post.comments_count || allComments.length,
      comments: topLevelComments,
      photo: post.photo
        ? (post.photo.startsWith('http') || post.photo.startsWith('data:image/')
            ? post.photo
            : `data:image/jpeg;base64,${post.photo.toString('base64')}`)
        : null,
    };

    console.log('[DEBUG] Final post structure - comments:', formattedPost.comments.length);
    console.log('[DEBUG] Comments with replies:', formattedPost.comments.filter(c => c.replies.length > 0).map(c => ({
      commentId: c.commentId,
      repliesCount: c.replies.length
    })));

    return res.status(200).json({ post: formattedPost });
  } catch (error) {
    console.error('❌ Error fetching post and comments:', error);
    return res.status(500).json({
      message: 'Error retrieving post and comments',
      error: error.message,
    });
  }
};

module.exports = handler;
