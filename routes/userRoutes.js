const express = require("express");
const userController = require("./../controllers/userController");
const router = express.Router();

router.route("/").get(userController.getAllUsers);
router.patch(
  "/update-me",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);

module.exports = router;
