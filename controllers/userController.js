const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const User = require("./../models/userModel");

const sharp = require("sharp");
const multer = require("multer");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image please upload only images", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`${process.cwd()}/public/img/users/${req.file.filename}`);

  next();
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = User.find();
  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.followUser = catchAsync(async (req, res, next) => {
  const userToFollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user.id);

  if (!userToFollow) {
    return next(new AppError("User not found", 404));
  }
  if (userToFollow._id.equals(currentUser._id)) {
    return next(new AppError("You cannot follow yourself", 400));
  }
  if (currentUser.following.some((id) => id.equals(userToFollow._id))) {
    return next(new AppError("You already follow this user", 400));
  }

  currentUser.following.push(userToFollow._id);
  await User.findByIdAndUpdate(currentUser._id, { following: currentUser.following });

  userToFollow.followers.push(currentUser._id);
  await User.findByIdAndUpdate(userToFollow._id, { followers: userToFollow.followers });

  res.status(200).json({
    status: "success",
    data: {
      followingCount: currentUser.following.length,
      followersCount: userToFollow.followers.length + 1,
    },
  });
});

exports.unfollowUser = catchAsync(async (req, res, next) => {
  const userToUnfollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user.id);

  if (!userToUnfollow) {
    return next(new AppError("User not found", 404));
  }
  if (!currentUser.following.some((id) => id.equals(userToUnfollow._id))) {
    return next(new AppError("You do not follow this user", 400));
  }

  currentUser.following = currentUser.following.filter(
    (id) => !id.equals(userToUnfollow._id)
  );
  await User.findByIdAndUpdate(currentUser._id, { following: currentUser.following });

  userToUnfollow.followers = userToUnfollow.followers.filter(
    (id) => !id.equals(currentUser._id)
  );
  await User.findByIdAndUpdate(userToUnfollow._id, { followers: userToUnfollow.followers });

  res.status(200).json({
    status: "success",
    message: "Unfollowed successfully",
  });
});

exports.getFollowers = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate("followers", "name photo");
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: { followers: user.followers },
  });
});

exports.getFollowing = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate("following", "name photo");
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: { following: user.following },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400,
      ),
    );
  }

  // Filter out unwanted fields that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email");
  if (req.file) filteredBody.photo = req.file.filename;

  // Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});
