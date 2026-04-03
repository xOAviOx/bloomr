const express = require("express");
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/userRoutes");
const postRouter = require("./routes/postRoutes");
const AppError = require("./utils/appError");

const app = express();

// View engine
app.set("view engine", "pug");
app.set("views", "views");

// Middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/v1/users/", userRouter);
app.use("/api/v1/posts/", postRouter);

// Middleware to handle form auth responses
const handleAuthResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (data.status === "success") {
      return res.redirect("/home");
    }
    // Handle error - render page with error message
    const route = req.originalUrl.includes("signup") ? "signup" : "login";
    return res.render(route, { error: data.message });
  };
  next();
};

// Authentication middleware
const protect = async (req, res, next) => {
  if (!req.cookies.jwt) {
    return res.redirect("/login");
  }

  try {
    const jwt = require("jsonwebtoken");
    const { promisify } = require("util");
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    const User = require("./models/userModel");
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.redirect("/login");
    }

    res.locals.user = user;
    next();
  } catch (err) {
    return res.redirect("/login");
  }
};

// View routes - Signup (protected - redirect if already logged in)
app.get("/signup", async (req, res) => {
  if (req.cookies.jwt) {
    try {
      const jwt = require("jsonwebtoken");
      const { promisify } = require("util");
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      const User = require("./models/userModel");
      const user = await User.findById(decoded.id);
      if (user) return res.redirect("/home");
    } catch (e) {}
  }
  res.render("signup", { error: null });
});

app.post("/signup", handleAuthResponse, (req, res, next) => {
  const authController = require("./controllers/authController");
  authController.signUp(req, res, next);
});

// View routes - Login (redirect if already logged in)
app.get("/login", async (req, res) => {
  if (req.cookies.jwt) {
    try {
      const jwt = require("jsonwebtoken");
      const { promisify } = require("util");
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      const User = require("./models/userModel");
      const user = await User.findById(decoded.id);
      if (user) return res.redirect("/home");
    } catch (e) {}
  }
  res.render("login", { error: null });
});

app.post("/login", handleAuthResponse, (req, res, next) => {
  const authController = require("./controllers/authController");
  authController.login(req, res, next);
});

app.get("/", async (req, res) => {
  if (req.cookies.jwt) {
    try {
      const jwt = require("jsonwebtoken");
      const { promisify } = require("util");
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      const User = require("./models/userModel");
      const user = await User.findById(decoded.id);
      if (user) return res.redirect("/home");
    } catch (e) {}
  }
  res.redirect("/login");
});

// Home route (protected) - shows all posts/feed
app.get("/home", protect, async (req, res, next) => {
  const Post = require("./models/postModel");

  // Fetch all posts, newest first, populate user info
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("userID", "name photo")
    .limit(50);

  res.render("home", { posts, error: null });
});

// Create post handler (for form submission from UI)
app.post("/create-post", protect, async (req, res, next) => {
  const Post = require("./models/postModel");

  // Create the post - content must be an array as per schema
  const post = await Post.create({
    userID: res.locals.user.id,
    content: [req.body.content],
  });

  // Redirect back to home with the new post
  res.redirect("/home");
});

// Logout route
app.get("/logout", (req, res, next) => {
  const authController = require("./controllers/authController");
  authController.logout(req, res);
});

app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

module.exports = app;
