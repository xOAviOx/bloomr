const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");
const router = express.Router();

router.post("/signup", authController.signUp);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.route("/").get(userController.getAllUsers);
router.patch(
  "/update-me",
  authController.protect,
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.post("/:id/follow", authController.protect, userController.followUser);
router.delete("/:id/follow", authController.protect, userController.unfollowUser);
router.get("/:id/followers", userController.getFollowers);
router.get("/:id/following", userController.getFollowing);

module.exports = router;
