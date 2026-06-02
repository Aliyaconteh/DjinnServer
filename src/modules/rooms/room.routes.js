const express = require("express");
const router = express.Router();
const RoomService = require("./room.service");

// 🟢 CREATE ROOM
router.post("/create", async (req, res) => {
  try {
    const { hostId, quizId, syncMode, delayLevel, delayMs, roomName, username } = req.body;
    console.log('Create room payload:', req.body);

    // Validate required fields
    if (!hostId) {
      return res.status(400).json({
        success: false,
        message: "hostId (username) is required"
      });
    }

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: "quizId is required"
      });
    }

    // Validate quizId is a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(quizId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid quizId format. Got: "${quizId}". Must be a UUID.`
      });
    }

    const room = await RoomService.createRoom(hostId, quizId, {
      syncMode,
      delayLevel,
      delayMs,
      roomName,
      username
    });

    res.json({
      success: true,
      data: room
    });

  } catch (err) {
    console.error("Room creation error:", err);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// 🟢 JOIN ROOM
router.post("/join", async (req, res) => {
  try {
    const { roomCode, user } = req.body;

    const result = await RoomService.joinRoom(roomCode, user);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// 🟢 GET ROOM INFO
router.get("/:roomCode", async (req, res) => {
  try {
    const data = await RoomService.getRoom(req.params.roomCode);

    res.json({
      success: true,
      data
    });

  } catch (err) {
    res.status(404).json({
      success: false,
      message: err.message
    });
  }
});

// 🟢 START ROOM
router.post("/start", async (req, res) => {
  try {
    const { roomCode } = req.body;

    const room = await RoomService.startRoom(roomCode);

    res.json({
      success: true,
      data: room
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

router.post("/finish", async (req, res) => {
  try {
    const { roomCode } = req.body;

    const room = await RoomService.finishRoom(roomCode);

    res.json({
      success: true,
      data: room
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});



module.exports = router;
