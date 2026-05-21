const LeaderboardRepository = require("./leaderboard.repository");
const RoomRepository = require("../rooms/room.repository");

class LeaderboardService {
  constructor(io) {
    this.io = io;
    this.leaderboards = new Map();
  }

  initRoom(roomCode) {
    if (!this.leaderboards.has(roomCode)) {
      this.leaderboards.set(roomCode, {});
    }
  }

  updateScore(roomCode, playerId, score, userId = null) {
    this.initRoom(roomCode);

    const board = this.leaderboards.get(roomCode);
    board[playerId] = {
      playerId,
      userId,
      score
    };

    this.broadcast(roomCode);

    RoomRepository.getRoomByCode(roomCode)
      .then((room) => {
        if (!room) return null;
        const rank = this.getSorted(roomCode).findIndex((row) => row.playerId === playerId) + 1;
        return LeaderboardRepository.upsertScore(room.id, playerId, userId, score, rank);
      })
      .catch((err) => {
        console.error("Failed to persist leaderboard:", err.message);
      });
  }

  getSorted(roomCode) {
    const board = this.leaderboards.get(roomCode) || {};

    return Object.entries(board)
      .map(([playerId, row]) => ({
        playerId,
        userId: row.userId,
        score: row.score
      }))
      .sort((a, b) => b.score - a.score);
  }

  broadcast(roomCode) {
    const sorted = this.getSorted(roomCode);

    this.io.to(roomCode).emit("leaderboard-update", {
      leaderboard: sorted
    });
  }

  clear(roomCode) {
    this.leaderboards.delete(roomCode);
  }

  async getPersisted(roomCode) {
    return await LeaderboardRepository.getByRoomCode(roomCode);
  }

  async getFinalResults(roomCode) {
    return await LeaderboardRepository.getFinalResults(roomCode);
  }

  async saveFinalResults(roomId, results) {
    return await LeaderboardRepository.saveSessionResults(roomId, results);
  }
}

module.exports = LeaderboardService;
