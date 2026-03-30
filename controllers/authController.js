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
