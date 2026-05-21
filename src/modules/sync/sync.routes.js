const express = require("express");
const SyncController = require("./sync.controller");

const router = express.Router();

router.get("/:roomCode/logs", (req, res) => SyncController.getLogs(req, res));
router.get("/:roomCode/summary", (req, res) => SyncController.getSummary(req, res));

module.exports = router;
