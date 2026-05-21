const roomSocket = require("./room.socket");
const gameSocket = require("./game.socket");
const syncSocket = require("./syn.socket")

function initSockets(io) {
  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    roomSocket(io, socket);
    gameSocket(io, socket);
    syncSocket(io, socket);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = initSockets;