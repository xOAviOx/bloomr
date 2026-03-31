const { decode } = require("punycode");

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const User = require("./../models/userModel");

const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    bio: req.body.bio,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  const token = signToken(newUser._id);

  //sending cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    secure: true,
    httpOnly: true,
  };
  cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);

  newUser.password = undefined;

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: newUser,
    },
  });
});
