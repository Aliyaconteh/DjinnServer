const GameEngine = require("../modules/game/game.engine");

let gameEngine;

module.exports = (io, socket) => {
  if (!gameEngine) {
    gameEngine = new GameEngine(io);
  }

  const startGame = async ({ roomCode, quizId }, callback = () => {}) => {
    try {
      const game = await gameEngine.startGame(roomCode, quizId);
      callback({ success: true, game });
    } catch (err) {
      callback({ success: false, message: err.message });
    }
  };

  socket.on("start-game", startGame);
  socket.on("start-quiz", startGame);

  socket.on("submit-answer", async (data, callback = () => {}) => {
    try {
      const {
        roomCode,
        playerId,
        userId,
        questionId,
        answer,
        clientTimestamp,
        predictedScore,
        delayMs
      } = data;

      const result = await gameEngine.submitAnswer(
        roomCode,
        playerId || userId,
        questionId,
        answer,
        { clientTimestamp, predictedScore, delayMs }
      );

      callback({ success: true, data: result });
    } catch (err) {
      callback({ success: false, message: err.message });
    }
  });

  socket.on("next-question", ({ roomCode }) => {
    gameEngine.processNextStep(roomCode);
  });

  socket.on("get-leaderboard", ({ roomCode }) => {
    const board = gameEngine.leaderboardService.getSorted(roomCode);

    socket.emit("leaderboard-update", {
      leaderboard: board
    });
  });
};
