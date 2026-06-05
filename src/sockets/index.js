const roomSocket = require("./room.socket");
const gameSocket = require("./game.socket");
const syncSocket = require("./syn.socket")

function initSockets(io) {
  io.on("connection", (socket) => {

    console.debug("Socket connected:", socket.id);

    roomSocket(io, socket);
    gameSocket(io, socket);
    syncSocket(io, socket);

    socket.on("disconnect", () => {
      console.debug("Socket disconnected:", socket.id);
    });
  });
}

module.exports = initSockets;