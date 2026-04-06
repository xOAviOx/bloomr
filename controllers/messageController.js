const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Message = require("./../models/messageModel");
const User = require("./../models/userModel");

// Get all conversations for current user
exports.getConversations = catchAsync(async (req, res, next) => {
  const messages = await Message.find({
    $or: [{ sender: req.user.id }, { recipient: req.user.id }],
  })
    .sort({ createdAt: -1 })
    .populate("sender", "name photo")
    .populate("recipient", "name photo");

  // Build unique conversation list
  const conversationMap = {};
  for (const msg of messages) {
    const otherId = msg.sender._id.equals(req.user.id)
      ? msg.recipient._id.toString()
      : msg.sender._id.toString();
    if (!conversationMap[otherId]) {
      conversationMap[otherId] = {
        user: msg.sender._id.equals(req.user.id) ? msg.recipient : msg.sender,
        lastMessage: msg,
        unread: 0,
      };
    }
    if (!msg.read && msg.sender._id.toString() !== req.user.id) {
      conversationMap[otherId].unread++;
    }
  }

  const conversations = Object.values(conversationMap).sort((a, b) =>
    b.lastMessage.createdAt - a.lastMessage.createdAt
  );

  res.status(200).json({ status: "success", data: { conversations } });
});

// Get messages with a specific user
exports.getMessages = catchAsync(async (req, res, next) => {
  const { otherId } = req.params;

  const messages = await Message.find({
    $or: [
      { sender: req.user.id, recipient: otherId },
      { sender: otherId, recipient: req.user.id },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("sender", "name photo")
    .populate("recipient", "name photo");

  res.status(200).json({ status: "success", data: { messages } });
});

// Send a message (REST fallback)
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { recipientId, content } = req.body;

  if (!recipientId || !content) {
    return next(new AppError("Recipient and content are required", 400));
  }

  const message = await Message.create({
    sender: req.user.id,
    recipient: recipientId,
    content,
  });

  await message.populate("sender", "name photo");
  await message.populate("recipient", "name photo");

  res.status(201).json({ status: "success", data: { message } });
});
