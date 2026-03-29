const validator = require("validator");
const bcrypt = require("bcryptjs");
const { default: mongoose } = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      minLength: [8, "A username must have more than 8 characters"],
      maxLength: [15, "A username must less than 15 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "A email is required"],
      unique: true,
      validate: [validator.isEmail, "Please fill correct email."],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "A password is required."],
      minLength: [8, "A password must have more than 8 characters"],
      maxLength: [15, "A password must less than 15 characters"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "User must confirm this password."],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same,",
      },
    },
    photo: { type: String, default: "default.jpg" },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    bio: {
      type: String,
      maxLength: [200, "Bio cannot exceed 200 characters"],
      default: "",
    },

    passwordChangedAt: Date,
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function (next) {
  //only run this function when the password is modified
  if (!this.isModified("password")) return next();
  //hash the password
  this.password = await bcrypt.hash(this.password, 12);

  //delete the password confirm field
  this.passwordConfirm = undefined;
  next();
});

//find only active users
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }

  //False means not changed
  return false;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
