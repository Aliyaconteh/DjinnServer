const SyncEngine = require("../modules/sync/sync.engine");

let syncEngine;

module.exports = (io, socket) => {
  if (!syncEngine) {
    syncEngine = new SyncEngine(io);
  }

  socket.on("optimistic-answer", (data) => {
    syncEngine.optimisticUpdate(data);
  });

  socket.on("confirm-answer", async (data, callback = () => {}) => {
    try {
      const serverScore = await syncEngine.serverValidate({
        ...data,
        responseEnd: Date.now()
      });

      callback({ success: true, serverScore });
    } catch (err) {
      callback({ success: false, message: err.message });
    }
  });

  socket.on("sync-reconcile", ({ roomCode, finalServerScores }) => {
    syncEngine.reconcile(roomCode, finalServerScores);
  });
};
