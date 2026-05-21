const RoomService = require("../modules/rooms/room.service");

module.exports = (io, socket) => {

  // 🎯 CREATE ROOM EVENT
  socket.on("create-room", async ({ hostId, quizId, syncMode, delayLevel, delayMs }, callback = () => {}) => {
    try {
      const room = await RoomService.createRoom(hostId, quizId, {
        syncMode,
        delayLevel,
        delayMs
      });

      socket.join(room.room_code);

      callback({
        success: true,
        room
      });

      socket.emit("room-created", { room });

      io.to(room.room_code).emit("room-updated", {
        message: "Room created",
        room
      });

    } catch (err) {
      callback({
        success: false,
        message: err.message
      });
    }
  });

  // 🎯 JOIN ROOM EVENT
  socket.on("join-room", async ({ roomCode, player }, callback = () => {}) => {
    try {
      const room = await RoomService.joinRoom(roomCode, player);

      socket.join(roomCode);

      callback({
        success: true,
        room
      });

      io.to(roomCode).emit("player-joined", {
        player
      });

    } catch (err) {
      callback({
        success: false,
        message: err.message
      });
    }
  });

};
