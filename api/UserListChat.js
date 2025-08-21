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
    const postQuery = `
      SELECT 
        _id, message, timestamp, username, sessionId, 
        likes, likedBy, comments_count, views_count, photo 
      FROM posts 
      WHERE _id = ?
    `;

    // Limit comments to 50 for now to avoid timeout
    const commentsQuery = `
      SELECT 
        comment_id, parent_comment_id, username, comment_text, 
        created_at, updated_at, hearts_count 
      FROM comments 
      WHERE post_id = ?
      ORDER BY created_at ASC
      LIMIT 50
    `;

    console.time('fetchPostAndComments');
    // Run queries in parallel
    const [[postResults], [commentResults]] = await Promise.all([
      promisePool.execute(postQuery, [id]),
      promisePool.execute(commentsQuery, [id]),
    ]);
    console.timeEnd('fetchPostAndComments');

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

    // Format comments and structure replies
    const allComments = commentResults.map(comment => ({
      commentId: comment.comment_id,
      parentCommentId: ['*NULL*', null, 'NULL'].includes(comment.parent_comment_id) ? null : comment.parent_comment_id,
      username: comment.username,
      profilePicture: usersMap[comment.username.toLowerCase()] || defaultPfp,
      commentText: comment.comment_text,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      hearts: comment.hearts_count || 0,
      replies: []
    }));

    const commentsMap = new Map();
    allComments.forEach(comment => commentsMap.set(comment.commentId, comment));

    const topLevelComments = [];
    const replies = [];

    allComments.forEach(comment => {
      if (comment.parentCommentId === null) {
        topLevelComments.push(comment);
      } else {
        replies.push(comment);
      }
    });

    replies.forEach(reply => {
      const parent = commentsMap.get(reply.parentCommentId);
      if (parent) {
        parent.replies.push(reply);
      } else {
        reply.parentCommentId = null;
        topLevelComments.push(reply);
      }
    });

    topLevelComments.forEach(comment => {
      comment.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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
