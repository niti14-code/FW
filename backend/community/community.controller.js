const CommunityPost = require('./community.model');
const User = require('../users/users.model');

// ── GET posts for the requesting user's college ───────────────────
const getPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('college');
    if (!user || !user.college) {
      return res.status(400).json({ message: 'College not found for this user' });
    }

    const posts = await CommunityPost.find({
      college: { $regex: new RegExp(`^${user.college.trim()}$`, 'i') }
    })
      .populate('author', 'name college')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(posts);
  } catch (err) {
    console.error('getPosts error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── CREATE a new post ─────────────────────────────────────────────
const createPost = async (req, res) => {
  try {
    const { content, type } = req.body;

    const user = await User.findById(req.user.userId).select('name college');
    if (!user || !user.college) {
      return res.status(400).json({ message: 'College not found for this user' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const post = await CommunityPost.create({
      author:  req.user.userId,
      college: user.college,
      type:    type || 'tip',
      content: content.trim()
    });

    // Populate for the response and for the socket broadcast
    const populated = await CommunityPost.findById(post._id).populate('author', 'name college');

    // Broadcast to all sockets in the same college room
    const io = req.app.get('io');
    if (io) {
      const collegeRoom = `college-${user.college.trim().toLowerCase().replace(/\s+/g, '-')}`;
      io.to(collegeRoom).emit('new-community-post', populated);
      console.log(`📢 Broadcast new post to room: ${collegeRoom}`);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error('createPost error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── TOGGLE like on a post ─────────────────────────────────────────
const toggleLike = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user.userId;
    const alreadyLiked = post.likedBy.some(id => id.toString() === userId);

    if (alreadyLiked) {
      post.likedBy.pull(userId);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedBy.push(userId);
      post.likes += 1;
    }

    await post.save();
    res.json({ likes: post.likes, liked: !alreadyLiked });
  } catch (err) {
    console.error('toggleLike error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPosts, createPost, toggleLike };
