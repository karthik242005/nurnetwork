const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { verifyToken } = require('../routes/auth'); // Ensure users are authenticated

// Create a new post
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const newPost = new Post({ user: req.user.id, title, content });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all posts
router.get('/all', async (req, res) => {
  try {
    const posts = await Post.find().populate('user', 'username').populate('responses.user', 'username');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a response to a post
router.post('/respond/:postId', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.responses.push({ user: req.user.id, content });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
