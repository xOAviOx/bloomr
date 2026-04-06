const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
      const User = require("./models/userModel");
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Join user's personal room
    socket.join(socket.user._id.toString());

    // Join DM rooms
    socket.on("join_dm", (otherUserId) => {
      const room = [socket.user._id.toString(), otherUserId].sort().join("_");
      socket.join(room);
    });

    // Handle sending a message
    socket.on("send_message", async ({ recipientId, content }) => {
      const Message = require("./models/messageModel");

      const message = await Message.create({
        sender: socket.user._id,
        recipient: recipientId,
        content,
      });

      await message.populate("sender", "name photo");
      await message.populate("recipient", "name photo");

      const room = [socket.user._id.toString(), recipientId].sort().join("_");

      // Send to both parties in the DM room
      io.to(room).emit("new_message", {
        _id: message._id,
        sender: message.sender,
        recipient: message.recipient,
        content: message.content,
        createdAt: message.createdAt,
        read: message.read,
      });
    });

    // Mark messages as read
    socket.on("mark_read", async ({ senderId }) => {
      const Message = require("./models/messageModel");
      await Message.updateMany(
        { sender: senderId, recipient: socket.user._id, read: false },
        { read: true }
      );
      socket.emit("messages_read", { senderId });
    });

    socket.on("disconnect", () => {
      // Cleanup if needed
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
