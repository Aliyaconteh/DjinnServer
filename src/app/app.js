const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("../modules/auth/auth.routes");
const quizRoutes = require("../modules/quizzes/quiz.routes");
const roomRoutes = require("../modules/rooms/room.routes");
const leaderboardRoutes = require("../modules/leaderboard/leaderboard.routes");
const syncRoutes = require("../modules/sync/sync.routes");

const app = express();

// Security middleware
app.use(helmet());

// Logging
app.use(morgan("dev"));

// CORS setup
app.use(cors({
  origin: "*",
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/sync", syncRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "QuizRoom API is running"
  });
});

module.exports = app;
