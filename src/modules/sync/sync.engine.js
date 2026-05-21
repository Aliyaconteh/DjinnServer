const { supabaseAdmin } = require("../../config/supabase.config");
const RoomRepository = require("../rooms/room.repository");

class SyncEngine {
  constructor(io) {
    this.io = io;
    this.tempState = new Map();
  }

  optimisticUpdate({ roomCode, playerId, userId, tempScore }) {
    if (!this.tempState.has(roomCode)) {
      this.tempState.set(roomCode, {});
    }

    const room = this.tempState.get(roomCode);
    const participantId = playerId || userId;
    room[participantId] = tempScore;

    this.io.to(roomCode).emit("optimistic-update", {
      playerId: participantId,
      userId,
      score: tempScore
    });
  }

  async serverValidate({
    roomCode,
    playerId,
    userId,
    question,
    answer,
    responseStart = Date.now(),
    responseEnd = Date.now()
  }) {
    const room = await RoomRepository.getRoomByCode(roomCode);
    if (!room) throw new Error("Room not found");
    if (!question) throw new Error("Question is required");

    const latency = responseEnd - responseStart;
    const isCorrect = question.correct_answer === answer;
    const serverScore = isCorrect ? 10 : 0;

    await supabaseAdmin.from("sync_logs").insert([{
      room_id: room.id,
      player_id: playerId || null,
      user_id: userId || null,
      sync_mode: "server",
      event_type: "confirm-answer",
      client_timestamp: responseStart,
      server_timestamp: responseEnd,
      latency,
      server_score: serverScore
    }]);

    this.io.to(roomCode).emit("server-confirmation", {
      playerId,
      userId,
      correct: isCorrect,
      serverScore
    });

    return serverScore;
  }

  reconcile(roomCode, finalServerScores = {}) {
    const optimistic = this.tempState.get(roomCode) || {};

    const results = Object.keys(finalServerScores).map((userId) => {
      const serverScore = finalServerScores[userId];
      const optimisticScore = optimistic[userId] || 0;

      return {
        userId,
        serverScore,
        optimisticScore,
        difference: optimisticScore - serverScore
      };
    });

    this.io.to(roomCode).emit("sync-reconciliation", {
      results
    });

    this.tempState.delete(roomCode);

    return results;
  }
}

module.exports = SyncEngine;
