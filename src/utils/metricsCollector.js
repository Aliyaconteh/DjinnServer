const { v4: uuidv4 } = require("uuid");
const { supabaseAdmin } = require("../config/supabase.config");

/**
 * Metrics Collector for Research Data (Supabase Compatible)
 * Tracks performance metrics for both synchronization models
 */
class MetricsCollector {
  constructor() {
    this.socketMetrics = new Map(); // socketId -> metrics
  }

  /**
   * Initialize metrics for a socket connection
   */
  initializeSocket(socketId, metadata) {
    this.socketMetrics.set(socketId, {
      socketId,
      userId: metadata.userId,
      connectedAt: metadata.connectedAt,
      submissions: [],
      latencies: {
        perceived: [],
        serverConfirmed: []
      }
    });
  }

  /**
   * Record submission metrics
   */
  recordSubmission(socketId, submissionData) {
    const socketMetrics = this.socketMetrics.get(socketId);
    if (!socketMetrics) return null;

    const submission = {
      submissionId: uuidv4(),
      timestamp: Date.now(),
      roomId: submissionData.roomId,
      playerId: submissionData.playerId,
      questionId: submissionData.questionId,
      answer: submissionData.answer,
      syncModel: submissionData.syncModel,
      clientTimestamp: submissionData.clientTimestamp,
      perceivedLatency: null,
      serverConfirmedLatency: null,
      isCorrect: null,
      clientPredictedScore: submissionData.clientPredictedScore || null,
      serverComputedScore: null,
      scoreMatch: null
    };

    socketMetrics.submissions.push(submission);
    return submission.submissionId;
  }

  /**
   * Record perceived latency
   */
  recordPerceivedLatency(socketId, submissionId, latencyMs) {
    const socketMetrics = this.socketMetrics.get(socketId);
    if (!socketMetrics) return;

    const submission = socketMetrics.submissions.find(s => s.submissionId === submissionId);
    if (submission) {
      submission.perceivedLatency = latencyMs;
      socketMetrics.latencies.perceived.push(latencyMs);
    }
  }

  /**
   * Record server latency
   */
  recordServerLatency(socketId, submissionId, latencyMs) {
    const socketMetrics = this.socketMetrics.get(socketId);
    if (!socketMetrics) return;

    const submission = socketMetrics.submissions.find(s => s.submissionId === submissionId);
    if (submission) {
      submission.serverConfirmedLatency = latencyMs;
      socketMetrics.latencies.serverConfirmed.push(latencyMs);
    }
  }

  /**
   * Record score consistency
   */
  recordScoreConsistency(socketId, submissionId, clientScore, serverScore) {
    const socketMetrics = this.socketMetrics.get(socketId);
    if (!socketMetrics) return;

    const submission = socketMetrics.submissions.find(s => s.submissionId === submissionId);
    if (submission) {
      submission.clientPredictedScore = clientScore;
      submission.serverComputedScore = serverScore;
      submission.scoreMatch = clientScore === serverScore;
    }
  }

  /**
   * Finalize socket metrics on disconnect (inserts sync logs to Supabase)
   */
  async finalizeSocket(socketId) {
    const socketMetrics = this.socketMetrics.get(socketId);
    if (!socketMetrics || socketMetrics.submissions.length === 0) {
      this.socketMetrics.delete(socketId);
      return;
    }

    try {
      const logs = socketMetrics.submissions.map(sub => ({
        room_id: sub.roomId,
        player_id: sub.playerId,
        question_id: sub.questionId,
        sync_mode: sub.syncModel,
        event_type: 'answer-submission',
        client_timestamp: BigInt(sub.clientTimestamp),
        server_timestamp: BigInt(sub.timestamp),
        latency: sub.serverConfirmedLatency || sub.perceivedLatency || 0,
        predicted_score: sub.clientPredictedScore || 0,
        server_score: sub.serverComputedScore || 0,
        reconciliation_required: sub.scoreMatch === false,
        score_difference: Math.abs((sub.serverComputedScore || 0) - (sub.clientPredictedScore || 0))
      }));

      const { error } = await supabaseAdmin
        .from("synchronization_logs")
        .insert(logs);

      if (error) {
        console.error("Error saving synchronization logs to database:", error.message);
      }
    } catch (err) {
      console.error("Exception saving metrics:", err.message);
    }

    this.socketMetrics.delete(socketId);
  }

  /**
   * Retrieve experimental metrics report for a room
   */
  async getMetricsReport(roomId) {
    try {
      const { data: logs, error } = await supabaseAdmin
        .from("synchronization_logs")
        .select("*")
        .eq("room_id", roomId);

      if (error) throw error;

      const total = logs?.length || 0;
      const consistentCount = logs?.filter(l => !l.reconciliation_required).length || 0;
      const latencySum = logs?.reduce((sum, row) => sum + Number(row.latency || 0), 0) || 0;

      return {
        roomId,
        metrics: {
          total_submissions: total,
          consistent_count: consistentCount,
          avg_latency: total ? Math.round(latencySum / total) : 0
        },
        consistencyRate: total > 0 ? ((consistentCount / total) * 100).toFixed(2) : 0
      };
    } catch (err) {
      console.error("Error in getMetricsReport:", err.message);
      throw err;
    }
  }

  /**
   * Compare both strategies globally for the dissertation paper
   */
  async compareModels() {
    try {
      const { data: logs, error } = await supabaseAdmin
        .from("synchronization_logs")
        .select("*");

      if (error) throw error;

      const serverAuthLogs = logs?.filter(l => l.sync_mode === 'server') || [];
      const optimisticLogs = logs?.filter(l => l.sync_mode === 'optimistic') || [];

      const calculateStats = (logGroup) => {
        const total = logGroup.length;
        if (total === 0) return { total: 0, avg_latency: 0, consistency_rate: 100 };
        
        const latencySum = logGroup.reduce((sum, row) => sum + Number(row.latency || 0), 0);
        const consistent = logGroup.filter(l => !l.reconciliation_required).length;
        
        return {
          total,
          avg_latency: Math.round(latencySum / total),
          consistency_rate: (consistent / total) * 100
        };
      };

      const serverStats = calculateStats(serverAuthLogs);
      const optimisticStats = calculateStats(optimisticLogs);

      return {
        serverAuthoritative: serverStats,
        optimistic: optimisticStats,
        analysis: {
          latencyDifferenceMs: optimisticStats.avg_latency - serverStats.avg_latency,
          consistencyDifferencePercentage: serverStats.consistency_rate - optimisticStats.consistency_rate
        }
      };
    } catch (err) {
      console.error("Error in compareModels:", err.message);
      throw err;
    }
  }
}

const metricsCollector = new MetricsCollector();

module.exports = { metricsCollector, MetricsCollector };
