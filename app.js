const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const userRouter = require("./routes/userRoutes");
const postRouter = require("./routes/postRoutes");
const chatbotRouter = require("./routes/chatbotRoutes");
const messageRouter = require("./routes/messageRoutes");
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
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed"));
  },
});

app.use("/api/v1/users/", userRouter);
app.use("/api/v1/posts/", postRouter);
app.use("/api/v1/chatbot/", chatbotRouter);
app.use("/api/v1/messages/", messageRouter);

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

// Internship data (using static data - replace with real API call)
// Free internship APIs with keys: InternSignal, RapidAPI JSearch
const sampleInternships = [
  {
    company: "Google",
    title: "Software Engineering Intern",
    location: "Mountain View, CA",
    stipend: "$8,000/month",
    duration: "12 weeks",
    description: "Work on real projects with Google's engineering teams. Learn from industry experts while contributing to production code.",
    tags: ["Software", "Full-time", "Remote OK"],
    link: "https://careers.google.com"
  },
  {
    company: "Meta",
    title: "Product Design Intern",
    location: "Menlo Park, CA",
    stipend: "$7,500/month",
    duration: "12 weeks",
    description: "Shape the future of social products. Collaborate with designers and engineers on Meta's family of apps.",
    tags: ["Design", "UI/UX", "Remote"],
    link: "https://careers.meta.com"
  },
  {
    company: "Microsoft",
    title: "Cloud Engineering Intern",
    location: "Seattle, WA",
    stipend: "$7,200/month",
    duration: "10 weeks",
    description: "Build scalable cloud solutions on Azure. Work with enterprise customers and learn modern cloud architecture.",
    tags: ["Cloud", "Azure", "Engineering"],
    link: "https://careers.microsoft.com"
  },
  {
    company: "Stripe",
    title: "Frontend Engineering Intern",
    location: "San Francisco, CA",
    stipend: "$9,000/month",
    duration: "12 weeks",
    description: "Build delightful payment experiences. Work on Stripe Dashboard and help developers integrate payments.",
    tags: ["Frontend", "React", "Remote OK"],
    link: "https://stripe.com/jobs"
  },
  {
    company: "Airbnb",
    title: "Data Science Intern",
    location: "San Francisco, CA",
    stipend: "$6,800/month",
    duration: "12 weeks",
    description: "Extract insights from massive datasets. Help improve search, recommendations, and pricing algorithms.",
    tags: ["Data Science", "Python", "SQL"],
    link: "https://careers.airbnb.com"
  },
  {
    company: "Spotify",
    title: "Machine Learning Intern",
    location: "New York, NY",
    stipend: "$7,000/month",
    duration: "12 weeks",
    description: "Build recommendation systems used by millions. Work on personalization and audio analysis features.",
    tags: ["ML", "AI", "Python"],
    link: "https://www.spotify.com/jobs"
  },
  {
    company: "Stripe",
    title: "Backend Engineering Intern",
    location: "Remote",
    stipend: "$9,000/month",
    duration: "12 weeks",
    description: "Scale payment infrastructure processing billions. Work on reliability, performance, and security.",
    tags: ["Backend", "Ruby", "Go"],
    link: "https://stripe.com/jobs"
  },
  {
    company: "Figma",
    title: "Developer Relations Intern",
    location: "San Francisco, CA",
    stipend: "$6,500/month",
    duration: "10 weeks",
    description: "Help designers and developers collaborate better. Create tutorials, sample projects, and documentation.",
    tags: ["DevRel", "Documentation", "Community"],
    link: "https://www.figma.com/careers"
  },
  {
    company: "Notion",
    title: "Product Management Intern",
    location: "San Francisco, CA",
    stipend: "$7,500/month",
    duration: "12 weeks",
    description: "Define the future of productivity tools. Work closely with engineering and design on new features.",
    tags: ["PM", "Product", "Strategy"],
    link: "https://www.notion.so/careers"
  }
];

// Internships route (protected)
app.get("/internships", protect, async (req, res) => {
  // TODO: Replace with real API call when you have an API key
  // Example with InternSignal API:
  // const response = await fetch('https://internsignal.com/api/v1/internships', {
  //   headers: { 'Authorization': `Bearer ${process.env.INTERNSIGNAL_API_KEY}` }
  // });
  // const data = await response.json();
  res.render("internships", { internships: sampleInternships });
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
  try {
    const Post = require("./models/postModel");

    // Create the post - content must be an array as per schema
    const post = await Post.create({
      userID: res.locals.user.id,
      content: [req.body.content],
    });

    // Redirect back to home with the new post
    res.redirect("/home");
  } catch (err) {
    console.error("Create post error:", err);
    res.redirect("/home");
  }
});

// Profile route (protected)
app.get("/profile", protect, async (req, res) => {
  res.render("profile", { error: null, success: null });
});

// Messages route
app.get("/messages", protect, async (req, res) => {
  res.render("messages", { preSelectedChat: req.query.chat || null });
});

// User profile route (anyone's profile)
app.get("/user/:id", protect, async (req, res) => {
  const User = require("./models/userModel");
  const Post = require("./models/postModel");
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) return res.redirect("/home");

  const posts = await Post.find({ userID: targetUser._id })
    .sort({ createdAt: -1 })
    .limit(50);

  const isOwnProfile = res.locals.user._id.equals(targetUser._id);

  res.render("userProfile", { user: targetUser, posts, isOwnProfile });
});

// Update profile handler (handles both text fields and file upload)
app.post("/profile/update", protect, upload.single("photo"), async (req, res) => {
  try {
    const User = require("./models/userModel");
    const updates = {};

    if (req.body.name) updates.name = req.body.name;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.file) updates.photo = `/uploads/${req.file.filename}`;
    else if (req.body.photo) updates.photo = req.body.photo;

    await User.findByIdAndUpdate(res.locals.user._id, updates, { new: true, runValidators: true });

    res.locals.user = await User.findById(res.locals.user._id);
    res.render("profile", { error: null, success: "Profile updated successfully!" });
  } catch (err) {
    res.render("profile", { error: err.message, success: null });
  }
});

// Change password handler
app.post("/profile/password", protect, async (req, res) => {
  try {
    const User = require("./models/userModel");
    const user = await User.findById(res.locals.user._id).select("+password");

    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.render("profile", { error: "Current password is incorrect", success: null });
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
      return res.render("profile", { error: "New passwords do not match", success: null });
    }

    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.confirmPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    res.render("profile", { error: null, success: "Password updated successfully!" });
  } catch (err) {
    res.render("profile", { error: err.message, success: null });
  }
});

// Delete account handler
app.post("/profile/delete", protect, async (req, res) => {
  try {
    const User = require("./models/userModel");
    await User.findByIdAndDelete(res.locals.user._id);
    res.cookie("jwt", "", { expires: new Date(0) });
    res.redirect("/signup");
  } catch (err) {
    res.render("profile", { error: err.message, success: null });
  }
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
