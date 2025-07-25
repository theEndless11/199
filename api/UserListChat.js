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

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // Preflight OK
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query;

  // ✅ If `id` is provided, fetch post by _id
 if (id) {
  try {
    // First: fetch the post by _id
    const postQuery = `
      SELECT 
        _id, message, timestamp, username, sessionId, 
        likes, dislikes, likedBy, dislikedBy, comments, photo 
      FROM posts 
      WHERE _id = ?
    `;
    const [postResults] = await promisePool.execute(postQuery, [id]);

    if (postResults.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = postResults[0];

    // Second: fetch profile picture from users table
    const userQuery = `
      SELECT COALESCE(profile_picture, ?) AS profilePicture
      FROM users
      WHERE username = ?
      LIMIT 1
    `;
    const defaultPfp = 'https://latestnewsandaffairs.site/public/pfp2.jpg';
    const [userResults] = await promisePool.execute(userQuery, [defaultPfp, post.username]);

    const userProfilePicture = userResults[0]?.profilePicture || defaultPfp;

    // Format the post
    const formattedPost = {
      _id: post._id,
      message: post.message,
      timestamp: post.timestamp,
      username: post.username,
      sessionId: post.sessionId,
      likes: post.likes,
      dislikes: post.dislikes,
      likedBy: post.likedBy ? JSON.parse(post.likedBy || '[]') : [],
      dislikedBy: post.dislikedBy ? JSON.parse(post.dislikedBy || '[]') : [],
      comments: post.comments ? JSON.parse(post.comments || '[]') : [],
      photo: post.photo
        ? (post.photo.startsWith('http') || post.photo.startsWith('data:image/')
          ? post.photo
          : `data:image/jpeg;base64,${post.photo.toString('base64')}`)
        : null,
      profilePicture: userProfilePicture, // ✅ Included profile picture
    };

    return res.status(200).json({ post: formattedPost });

  } catch (error) {
    console.error('❌ Error fetching post by ID:', error);
    return res.status(500).json({ message: 'Error retrieving post', error });
  }
}


  // ✅ Otherwise, return a list of users
  try {
    console.time('DB Query');
    const [users] = await promisePool.execute(
      'SELECT id, username, COALESCE(profile_picture, ?) as profile_picture FROM users LIMIT 100',
      ['https://latestnewsandaffairs.site/public/pfp2.jpg']
    );
    console.timeEnd('DB Query');

    return res.status(200).json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users', error });
  }
};

module.exports = handler;




