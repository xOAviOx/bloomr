const express = require("express");
const userRouter = require("./routes/userRoutes");
const AppError = require("./utils/appError");

const app = express();

app.use("/api/v1/users/", userRouter);
// app.use("/api/v1/posts/", postRouter);
// app.use("/", viewRouter);
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
module.exports = app;
