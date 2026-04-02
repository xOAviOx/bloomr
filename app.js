const express = require("express");
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/userRoutes");
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

// Middleware to handle form auth responses
const handleAuthResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (data.status === "success") {
      return res.redirect("/dashboard");
    }
    // Handle error - render page with error message
    const route = req.originalUrl.includes("signup") ? "signup" : "login";
    return res.render(route, { error: data.message });
  };
  next();
};

// View routes - Signup
app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

app.post("/signup", handleAuthResponse, (req, res, next) => {
  const authController = require("./controllers/authController");
  authController.signUp(req, res, next);
});

// View routes - Login
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", handleAuthResponse, (req, res, next) => {
  const authController = require("./controllers/authController");
  authController.login(req, res, next);
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

// Dashboard route (protected)
app.get("/dashboard", async (req, res, next) => {
  const authController = require("./controllers/authController");

  // Run the isLoggedIn check manually for rendered pages
  if (req.cookies.jwt) {
    try {
      const jwt = require("jsonwebtoken");
      const { promisify } = require("util");
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
      const User = require("./models/userModel");
      const user = await User.findById(decoded.id);

      if (user) {
        res.locals.user = user;
        return res.render("dashboard");
      }
    } catch (err) {
      // Token invalid or expired
    }
  }

  // Not logged in, redirect to login
  res.redirect("/login");
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
