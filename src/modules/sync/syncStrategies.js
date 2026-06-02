/**
 * Synchronization Strategies for Real-Time Quiz System
 * Research component: Comparing server-authoritative vs optimistic updates
 */

/**
 * Server-Authoritative Synchronization Strategy
 * 
 * Model characteristics:
 * - Server is single source of truth
 * - Client sends action, server validates and processes
 * - Server broadcasts authoritative state to all clients
 * - Higher consistency, potential latency perception
 * - No conflict resolution needed
 */
class ServerAuthoritativeStrategy {
  constructor(io, metricsCollector) {
    this.io = io;
    this.metricsCollector = metricsCollector;
    this.name = 'server-authoritative';
  }

  /**
   * Handle answer submission with server-authoritative model
   */
  async handleSubmission(socket, data, context) {
    const { roomId, playerId, questionId, answer, clientTimestamp } = data;
    const serverReceivedTime = Date.now();

    try {
      // 1. Server validates the submission
      const validationResult = await this.validateSubmission(
        roomId, 
        playerId, 
        questionId, 
        answer,
        context.room
      );

      if (!validationResult.valid) {
        socket.emit('submission_rejected', {
          reason: validationResult.reason,
          timestamp: serverReceivedTime
        });
        return;
      }

      // 2. Server computes score (authoritative)
      const score = this.computeScore(
        validationResult.isCorrect,
        serverReceivedTime,
        clientTimestamp,
        context.question.timeLimit
      );

      // 3. Store submission in database
      const submission = await this.storeSubmission(
        roomId,
        playerId,
        questionId,
        answer,
        validationResult.isCorrect,
        score
      );

      // 4. Record metrics
      const confirmedTime = Date.now();
      const roundTripTime = confirmedTime - clientTimestamp;
      
      this.metricsCollector.recordSubmission(socket.id, {
        roomId,
        playerId,
        questionId,
        answer,
        syncModel: this.name,
        clientTimestamp,
        clientPredictedScore: null // No client prediction in server-authoritative
      });

      this.metricsCollector.recordServerLatency(socket.id, submission.id, roundTripTime);

      // 5. Respond to submitting client (confirmation)
      socket.emit('answer_confirmed', {
        isCorrect: validationResult.isCorrect,
        pointsAwarded: score,
        timestamp: confirmedTime,
        model: this.name
      });

      // 6. Broadcast updated leaderboard to ALL clients (authoritative state)
      const updatedLeaderboard = await this.getUpdatedLeaderboard(roomId);
      this.io.to(roomId).emit('leaderboard_update', {
        leaderboard: updatedLeaderboard,
        timestamp: confirmedTime,
        model: this.name
      });

      // 7. Emit question statistics
      const stats = await this.getQuestionStats(questionId, roomId);
      this.io.to(roomId).emit('question_stats', {
        questionId,
        stats,
        timestamp: confirmedTime
      });

    } catch (error) {
      console.error('Error in server-authoritative submission:', error);
      socket.emit('submission_error', {
        message: 'Server error processing submission',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Validate submission on server
   */
  async validateSubmission(roomId, playerId, questionId, answer, room) {
    // Check if room exists and is active
    if (!room || room.status !== 'in_progress') {
      return { valid: false, reason: 'Room not in active quiz' };
    }

    // Check if question is current
    if (room.current_question_index < 0) {
      return { valid: false, reason: 'Quiz not started yet' };
    }

    // Check if answer is in valid format
    if (!['A', 'B', 'C', 'D'].includes(answer)) {
      return { valid: false, reason: 'Invalid answer format' };
    }

    // Check if player hasn't already submitted for this question
    const existing = await this.checkExistingSubmission(roomId, playerId, questionId);
    if (existing) {
      return { valid: false, reason: 'Already submitted for this question' };
    }

    // Validate answer against correct answer
    const question = await this.getQuestion(questionId);
    const isCorrect = answer === question.correct_answer;

    return { valid: true, isCorrect };
  }

  /**
   * Compute score based on server rules
   * Formula: Base points for correct answer + Speed bonus
   */
  computeScore(isCorrect, serverTime, clientTime, timeLimit) {
    if (!isCorrect) return 0;

    const basePoints = 100;
    const timeElapsed = (serverTime - clientTime) / 1000; // in seconds
    const timeTaken = Math.max(0, timeLimit - timeElapsed);
    const speedBonus = Math.round((timeTaken / timeLimit) * 50); // Up to 50 bonus points

    return basePoints + speedBonus;
  }

  /**
   * Store submission in database
   */
  async storeSubmission(roomId, playerId, questionId, answer, isCorrect, score) {
    const { v4: uuidv4 } = require('uuid');
    const { query } = require('../database/init');

    const submissionId = uuidv4();
    await query(
      `INSERT INTO submissions 
       (id, room_id, player_id, question_id, submitted_answer, is_correct, points_awarded, sync_model_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [submissionId, roomId, playerId, questionId, answer, isCorrect, score, this.name]
    );

    // Update player's final score
    await query(
      `UPDATE players 
       SET final_score = final_score + $1
       WHERE id = $2`,
      [score, playerId]
    );

    return { id: submissionId, score };
  }

  /**
   * Get updated leaderboard
   */
  async getUpdatedLeaderboard(roomId) {
    const { getAll } = require('../database/init');

    const leaderboard = await getAll(
      `SELECT p.id, p.nickname, p.final_score, u.username
       FROM players p
       JOIN users u ON p.user_id = u.id
       WHERE p.room_id = $1
       ORDER BY p.final_score DESC, p.joined_at ASC`,
      [roomId]
    );

    return leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player
    }));
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(questionId, roomId) {
    const { getOne } = require('../database/init');

    return await getOne(
      `SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_count,
        SUM(CASE WHEN submitted_answer = 'A' THEN 1 ELSE 0 END) as option_a_count,
        SUM(CASE WHEN submitted_answer = 'B' THEN 1 ELSE 0 END) as option_b_count,
        SUM(CASE WHEN submitted_answer = 'C' THEN 1 ELSE 0 END) as option_c_count,
        SUM(CASE WHEN submitted_answer = 'D' THEN 1 ELSE 0 END) as option_d_count
       FROM submissions
       WHERE question_id = $1 AND room_id = $2`,
      [questionId, roomId]
    );
  }

  async checkExistingSubmission(roomId, playerId, questionId) {
    const { getOne } = require('../database/init');
    return await getOne(
      `SELECT id FROM submissions WHERE room_id = $1 AND player_id = $2 AND question_id = $3`,
      [roomId, playerId, questionId]
    );
  }

  async getQuestion(questionId) {
    const { getOne } = require('../database/init');
    return await getOne(
      `SELECT * FROM questions WHERE id = $1`,
      [questionId]
    );
  }
}

/**
 * Optimistic Client-Side Update Synchronization Strategy
 * 
 * Model characteristics:
 * - Client optimistically updates UI immediately
 * - Client predicts score locally
 * - Server validates asynchronously
 * - Server sends confirmation/correction
 * - Lower perceived latency, risk of temporary inconsistency
 * - Requires reconciliation logic
 */
class OptimisticStrategy {
  constructor(io, metricsCollector) {
    this.io = io;
    this.metricsCollector = metricsCollector;
    this.name = 'optimistic';
    this.clientPredictions = new Map(); // Track client predictions for reconciliation
  }

  /**
   * Handle answer submission with optimistic model
   */
  async handleSubmission(socket, data, context) {
    const { roomId, playerId, questionId, answer, clientTimestamp, clientPredictedScore } = data;
    const serverReceivedTime = Date.now();

    try {
      // 1. Immediately acknowledge submission (optimistic confirmation)
      socket.emit('answer_confirmed', {
        isCorrect: null, // To be determined by server
        pointsAwarded: clientPredictedScore, // Use client's prediction temporarily
        timestamp: serverReceivedTime,
        model: this.name,
        optimistic: true
      });

      // Broadcast optimistic leaderboard update to client only
      socket.emit('optimistic_leaderboard_update', {
        playerId,
        predictedScore: clientPredictedScore,
        timestamp: serverReceivedTime
      });

      // 2. Record metrics for optimistic prediction
      this.metricsCollector.recordSubmission(socket.id, {
        roomId,
        playerId,
        questionId,
        answer,
        syncModel: this.name,
        clientTimestamp,
        clientPredictedScore
      });

      // Store client prediction for reconciliation
      const predictionKey = `${roomId}:${playerId}:${questionId}`;
      this.clientPredictions.set(predictionKey, {
        playerId,
        clientPredictedScore,
        timestamp: serverReceivedTime
      });

      // 3. Asynchronously validate on server (non-blocking)
      setImmediate(() => {
        this.validateAndReconcile(socket, roomId, playerId, questionId, answer, clientPredictedScore, clientTimestamp, context);
      });

    } catch (error) {
      console.error('Error in optimistic submission:', error);
      socket.emit('submission_error', {
        message: 'Error processing optimistic submission',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Validate and reconcile after optimistic update
   */
  async validateAndReconcile(socket, roomId, playerId, questionId, answer, clientPredictedScore, clientTimestamp, context) {
    try {
      const serverReconciliationTime = Date.now();

      // 1. Server-side validation
      const validationResult = await this.validateSubmission(
        roomId,
        playerId,
        questionId,
        answer,
        context.room
      );

      if (!validationResult.valid) {
        // Notify of rejection
        socket.emit('submission_rejected', {
          reason: validationResult.reason,
          timestamp: serverReconciliationTime,
          wasOptimistic: true
        });
        return;
      }

      // 2. Compute authoritative score
      const serverComputedScore = this.computeScore(
        validationResult.isCorrect,
        serverReconciliationTime,
        clientTimestamp,
        context.question.timeLimit
      );

      // 3. Check for mismatch between client prediction and server computation
      const hasScoreMismatch = clientPredictedScore !== serverComputedScore;

      // 4. Store submission
      const submission = await this.storeSubmission(
        roomId,
        playerId,
        questionId,
        answer,
        validationResult.isCorrect,
        serverComputedScore,
        clientPredictedScore,
        hasScoreMismatch
      );

      // 5. Record metrics
      const roundTripTime = serverReconciliationTime - clientTimestamp;
      this.metricsCollector.recordServerLatency(socket.id, submission.id, roundTripTime);
      this.metricsCollector.recordScoreConsistency(socket.id, submission.id, clientPredictedScore, serverComputedScore);

      // 6. If mismatch, send correction
      if (hasScoreMismatch) {
        socket.emit('score_reconciliation', {
          clientPredicted: clientPredictedScore,
          serverComputed: serverComputedScore,
          correction: serverComputedScore - clientPredictedScore,
          timestamp: serverReconciliationTime,
          conflictResolved: true
        });

        // Notify host of correction for transparency
        this.io.to(`${roomId}:host`).emit('conflict_detected', {
          playerId,
          clientPredicted: clientPredictedScore,
          serverComputed: serverComputedScore
        });
      }

      // 7. Broadcast authoritative leaderboard to all
      const updatedLeaderboard = await this.getUpdatedLeaderboard(roomId);
      this.io.to(roomId).emit('leaderboard_update', {
        leaderboard: updatedLeaderboard,
        timestamp: serverReconciliationTime,
        model: this.name,
        reconciliation: hasScoreMismatch
      });

    } catch (error) {
      console.error('Error in reconciliation:', error);
    }
  }

  async validateSubmission(roomId, playerId, questionId, answer, room) {
    const { getOne } = require('../database/init');

    if (!room || room.status !== 'in_progress') {
      return { valid: false, reason: 'Room not in active quiz' };
    }

    if (!['A', 'B', 'C', 'D'].includes(answer)) {
      return { valid: false, reason: 'Invalid answer format' };
    }

    const existing = await getOne(
      `SELECT id FROM submissions WHERE room_id = $1 AND player_id = $2 AND question_id = $3`,
      [roomId, playerId, questionId]
    );

    if (existing) {
      return { valid: false, reason: 'Already submitted' };
    }

    const question = await getOne(`SELECT * FROM questions WHERE id = $1`, [questionId]);
    const isCorrect = answer === question.correct_answer;

    return { valid: true, isCorrect };
  }

  computeScore(isCorrect, serverTime, clientTime, timeLimit) {
    if (!isCorrect) return 0;

    const basePoints = 100;
    const timeElapsed = (serverTime - clientTime) / 1000;
    const timeTaken = Math.max(0, timeLimit - timeElapsed);
    const speedBonus = Math.round((timeTaken / timeLimit) * 50);

    return basePoints + speedBonus;
  }

  async storeSubmission(roomId, playerId, questionId, answer, isCorrect, serverScore, clientScore, hasMismatch) {
    const { v4: uuidv4 } = require('uuid');
    const { query } = require('../database/init');

    const submissionId = uuidv4();
    await query(
      `INSERT INTO submissions 
       (id, room_id, player_id, question_id, submitted_answer, is_correct, points_awarded, sync_model_used, client_predicted_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [submissionId, roomId, playerId, questionId, answer, isCorrect, serverScore, this.name, clientScore]
    );

    await query(
      `UPDATE players SET final_score = final_score + $1 WHERE id = $2`,
      [serverScore, playerId]
    );

    // Clear prediction from map
    const predictionKey = `${roomId}:${playerId}:${questionId}`;
    this.clientPredictions.delete(predictionKey);

    return { id: submissionId, score: serverScore };
  }

  async getUpdatedLeaderboard(roomId) {
    const { getAll } = require('../database/init');

    return await getAll(
      `SELECT p.id, p.nickname, p.final_score, u.username
       FROM players p
       JOIN users u ON p.user_id = u.id
       WHERE p.room_id = $1
       ORDER BY p.final_score DESC, p.joined_at ASC`,
      [roomId]
    );
  }

  getUnreconciledPredictions() {
    return Array.from(this.clientPredictions.entries()).map(([key, value]) => ({
      key,
      ...value
    }));
  }
}

module.exports = {
  ServerAuthoritativeStrategy,
  OptimisticStrategy
};
