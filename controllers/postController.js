const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Post = require("./../models/postModel");

const multer = require("multer");
const sharp = require("sharp");

// Multer config for image upload////
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadPostImage = upload.single("image");

exports.resizePostImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `post-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(800, 600)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`${process.cwd()}/public/img/posts/${req.file.filename}`);

  next();
});

// Get all posts (for feed)///
exports.getAllPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("userID", "name photo")
    .limit(50);

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});

// Create a new post ///
exports.createPost = catchAsync(async (req, res, next) => {
  // Get user from the protect middleware
  if (!req.user) {
    return next(new AppError("You must be logged in to create a post", 401));
  }

  const postData = {
    userID: req.user._id,
    content: req.body.content,
  };

  // Add image if uploaded///
  if (req.file) {
    postData.imageUrl = `/img/posts/${req.file.filename}`;
  }

  const post = await Post.create(postData);

  res.status(201).json({
    status: "success",
    data: {
      post,
    },
  });
});

// Get current user's posts
exports.getMyPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find({ userID: req.user.id })
    .sort({ createdAt: -1 })
    .populate("userID", "name photo");

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});

// Delete a post (only by owner)///
exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  // Check if user owns the post
  if (post.userID.toString() !== req.user._id.toString()) {
    return next(new AppError("You can only delete your own posts", 403));
  }

  await Post.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Like a post (toggle)///
exports.likePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  const userId = req.user._id;

  // Toggle like: remove if already liked, add if not
  const isLiked = post.likes.some((id) => id.equals(userId));
  if (isLiked) {
    post.likes = post.likes.filter((id) => !id.equals(userId));
  } else {
    post.likes.push(userId);
  }

  await post.save();

  res.status(200).json({
    status: "success",
    data: {
      likes: post.likes,
      likeCount: post.likes.length,
      isLiked: !isLiked, // true if just liked, false if just unliked
    },
  });
});

// Add a comment to a post///
exports.addComment = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  const comment = {
    userID: req.user._id,
    content: req.body.content,
  };

  post.comments.push(comment);
  await post.save();

  // Populate the new comment's user info
  const populatedPost = await Post.findById(req.params.id)
    .populate("comments.userID", "name photo");

  const newComment = populatedPost.comments[populatedPost.comments.length - 1];

  res.status(201).json({
    status: "success",
    data: {
      comment: newComment,
    },
  });
});

// Delete a comment (only by comment owner)///
exports.deleteComment = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);

  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  const comment = post.comments.id(req.params.commentId);

  if (!comment) {
    return next(new AppError("No comment found with that ID", 404));
  }

  // Check if user owns the comment
  if (comment.userID.toString() !== req.user._id.toString()) {
    return next(new AppError("You can only delete your own comments", 403));
  }

  comment.deleteOne();
  await post.save();

  res.status(204).json({
    status: "success",
    data: null,
  });
});