const express = require("express");
const chatbotController = require("../controllers/chatbotController");
const authController = require("../controllers/authController");

const router = express.Router();

// Protected: chatbot endpoint (requires login)
router.post(
  "/",
  authController.protect,
  chatbotController.chatbot,
);

module.exports = router;