const express = require("express");
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/userRoutes");
const AppError = require("./utils/appError");

const app = express();

// Middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));
app.use(cookieParser());

app.use("/api/v1/users/", userRouter);
// app.use("/api/v1/posts/", postRouter);
// app.use("/", viewRouter);
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
