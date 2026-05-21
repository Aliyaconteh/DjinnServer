const QuizRepository = require("../quizzes/quiz.repository");
const RoomRepository = require("../rooms/room.repository");
const LeaderboardService = require("../leaderboard/leaderboard.service");
const gameRepository = require("./game.repository");

class GameEngine {
  constructor(io) {
    this.io = io;
    this.leaderboardService = new LeaderboardService(io);
    this.activeGames = new Map();
  }

  async startGame(roomCode, quizId) {
    const room = await RoomRepository.getRoomByCode(roomCode);
    if (!room) throw new Error("Room not found");

    const resolvedQuizId = quizId || room.quiz_id;
    if (!resolvedQuizId) throw new Error("Quiz ID is required");

    const quiz = await QuizRepository.getQuizWithQuestions(resolvedQuizId);
    if (!quiz.questions || quiz.questions.length === 0) {
      throw new Error("Quiz must contain at least one question");
    }
    const players = await RoomRepository.getPlayers(room.id);
    const scores = {};
    const playerState = {};

    players.forEach((player) => {
      scores[player.id] = Number(player.score || 0);
      playerState[player.id] = player;
      if (player.user_id) playerState[player.user_id] = player;
    });

    const gameState = {
      room,
      quiz,
      currentIndex: 0,
      scores,
      players: playerState,
      answered: new Set(),
      timers: new Set(),
      startedAt: Date.now()
    };

    this.activeGames.set(roomCode, gameState);

    await gameRepository.createSession({
      room_id: room.id,
      started_at: new Date(),
      status: "running"
    });

    await RoomRepository.updateStatus(roomCode, "active");
    this.sendQuestion(roomCode);

    return {
      roomCode,
      quizId: resolvedQuizId,
      currentIndex: gameState.currentIndex
    };
  }

  sendQuestion(roomCode) {
    const game = this.activeGames.get(roomCode);
    if (!game) return;

    const question = game.quiz.questions[game.currentIndex];
    if (!question) {
      this.endGame(roomCode);
      return;
    }

    const payload = {
      index: game.currentIndex,
      question: {
        id: question.id,
        text: question.question,
        options: question.options,
        timeLimit: question.time_limit
      },
      serverTime: Date.now()
    };

    gameRepository.updateSessionQuestion(game.room.id, game.currentIndex).catch((err) => {
      console.error("Failed to update session question:", err.message);
    });

    this.io.to(roomCode).emit("new-question", payload);
    this.io.to(roomCode).emit("question-started", payload);
    this.startTimer(roomCode, question.time_limit);
  }

  startTimer(roomCode, duration) {
    this.clearTimers(roomCode);
    let timeLeft = duration;

    const interval = setInterval(() => {
      timeLeft -= 1;

      this.io.to(roomCode).emit("timer-update", {
        timeLeft,
        serverTime: Date.now()
      });

      if (timeLeft <= 0) {
        clearInterval(interval);
        const game = this.activeGames.get(roomCode);
        if (game) game.timers.delete(interval);
        this.processNextStep(roomCode);
      }
    }, 1000);

    const game = this.activeGames.get(roomCode);
    if (game) game.timers.add(interval);
  }

  async submitAnswer(roomCode, playerId, questionId, answer, metadata = {}) {
    const game = this.activeGames.get(roomCode);
    if (!game) throw new Error("Game is not active");
    if (!playerId) throw new Error("Player ID is required");

    const question = game.quiz.questions[game.currentIndex];
    if (!question || question.id !== questionId) {
      throw new Error("Question is not currently active");
    }

    const player = await this.resolvePlayer(game, playerId);
    playerId = player.id;
    const answerKey = `${playerId}:${questionId}`;
    if (game.answered.has(answerKey)) {
      throw new Error("Answer already submitted for this question");
    }
    game.answered.add(answerKey);

    const submittedAt = Number(metadata.clientTimestamp || Date.now());
    const artificialDelay = Number(metadata.delayMs ?? game.room.delay_ms ?? 0);
    if (artificialDelay > 0) {
      await this.sleep(artificialDelay);
    }

    const isCorrect = question.correct_answer === answer;

    if (!game.scores[playerId]) {
      game.scores[playerId] = 0;
    }

    if (isCorrect) {
      game.scores[playerId] += 10;
    }

    this.leaderboardService.updateScore(roomCode, playerId, game.scores[playerId], player.user_id);

    const serverTime = Date.now();
    const predictedScore = Number(metadata.predictedScore ?? game.scores[playerId]);
    const reconciliationRequired = predictedScore !== game.scores[playerId];

    await gameRepository.saveAnswer({
      room_id: game.room.id,
      player_id: playerId,
      user_id: player.user_id,
      question_id: questionId,
      selected_answer: answer,
      is_correct: isCorrect,
      response_time: Math.max(0, serverTime - submittedAt)
    });

    await gameRepository.saveSyncLog({
      room_id: game.room.id,
      player_id: playerId,
      user_id: player.user_id,
      question_id: questionId,
      sync_mode: game.room.sync_mode,
      event_type: "submit-answer",
      delay_level: game.room.delay_level,
      artificial_delay_ms: artificialDelay,
      client_timestamp: submittedAt,
      server_timestamp: serverTime,
      latency: Math.max(0, serverTime - submittedAt),
      predicted_score: predictedScore,
      server_score: game.scores[playerId],
      reconciliation_required: reconciliationRequired,
      score_difference: predictedScore - game.scores[playerId]
    });

    const payload = {
      playerId,
      userId: player.user_id,
      score: game.scores[playerId],
      correct: isCorrect,
      reconciliationRequired,
      serverTime
    };

    this.io.to(roomCode).emit("score-update", payload);
    this.io.to(roomCode).emit("server-confirmation", payload);

    return payload;
  }

  async resolvePlayer(game, playerId) {
    if (!game.players[playerId]) {
      const player = await RoomRepository.getPlayerById(game.room.id, playerId)
        || await RoomRepository.getPlayerByUserId(game.room.id, playerId);
      if (!player) throw new Error("Player is not registered in this room");
      game.players[playerId] = player;
      game.players[player.id] = player;
    }

    return game.players[playerId];
  }

  processNextStep(roomCode) {
    const game = this.activeGames.get(roomCode);
    if (!game) return;

    this.clearTimers(roomCode);
    game.currentIndex += 1;
    game.answered = new Set();

    if (game.currentIndex >= game.quiz.questions.length) {
      this.endGame(roomCode);
    } else {
      this.sendQuestion(roomCode);
    }
  }

  clearTimers(roomCode) {
    const game = this.activeGames.get(roomCode);
    if (!game) return;

    this.clearTimers(roomCode);
    game.timers.clear();
  }

  async endGame(roomCode) {
    const game = this.activeGames.get(roomCode);
    if (!game) return;

    const finalLeaderboard = Object.entries(game.scores)
      .map(([playerId, score]) => ({
        playerId,
        userId: game.players[playerId]?.user_id || null,
        score
      }))
      .sort((a, b) => b.score - a.score);

    const payload = {
      leaderboard: finalLeaderboard
    };

    this.io.to(roomCode).emit("game-ended", payload);
    this.io.to(roomCode).emit("quiz-ended", payload);

    game.timers.forEach((timer) => clearInterval(timer));
    await this.leaderboardService.saveFinalResults(game.room.id, finalLeaderboard);
    await gameRepository.endSession(roomCode);
    await RoomRepository.updateStatus(roomCode, "finished");

    this.leaderboardService.clear(roomCode);
    this.activeGames.delete(roomCode);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = GameEngine;
