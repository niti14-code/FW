const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { getPosts, createPost, toggleLike } = require('./community.controller');

router.get('/',          auth, getPosts);
router.post('/',         auth, createPost);
router.patch('/:id/like', auth, toggleLike);

module.exports = router;
