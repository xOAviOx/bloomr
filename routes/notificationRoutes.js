const express = require("express");
const authController = require("./../controllers/authController");
const Notification = require("./../models/notificationModel");

const router = express.Router();

// Get all notifications for current user
router.get("/", authController.protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name photo")
      .populate("post", "content imageUrl");

    const total = await Notification.countDocuments({ recipient: req.user._id });
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.status(200).json({
      status: "success",
      data: {
        notifications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Mark single notification as read
router.patch("/:id/read", authController.protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ status: "fail", message: "Notification not found" });
    }

    res.status(200).json({ status: "success", data: { notification } });
  } catch (err) {
    next(err);
  }
});

// Mark all notifications as read
router.patch("/read-all", authController.protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({ status: "success", message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
});

// Delete a notification
router.delete("/:id", authController.protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ status: "fail", message: "Notification not found" });
    }

    res.status(204).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
