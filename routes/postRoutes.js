const express = require("express");
const postController = require("./../controllers/postController");
const authController = require("./../controllers/authController");

const router = express.Router();

// Public: Get all posts
router.get("/", postController.getAllPosts);

// Protected: Create a post
router.post(
  "/",
  authController.protect,
  postController.createPost,
);

// Protected: Get my posts
router.get("/my-posts", authController.protect, postController.getMyPosts);

// Delete a post (owner only)
router.delete("/:id", authController.protect, postController.deletePost);

module.exports = router;