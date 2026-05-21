const RoomService = require("./room.service");

class RoomController {

  async createRoom(req, res) {
    try {
      const hostId = req.body.hostId;

      const room = await RoomService.createRoom(hostId);

      res.json({
        success: true,
        data: room
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async joinRoom(req, res) {
    try {
      const { roomCode, player } = req.body;

      const room = await RoomService.joinRoom(roomCode, player);

      res.json({
        success: true,
        data: room
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
}

module.exports = new RoomController();