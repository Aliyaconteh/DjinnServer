const express = require("express");
const LeaderboardController = require("./leaderboard.controller");

const router = express.Router();

router.get("/:roomCode", (req, res) => LeaderboardController.getLive(req, res));
router.get("/:roomCode/final", (req, res) => LeaderboardController.getFinal(req, res));

module.exports = router;
