const { supabaseAdmin } = require("../../config/supabase.config");
const RoomRepository = require("../rooms/room.repository");

class SyncRepository {
  async getLogs(roomCode, limit = 100) {
    const room = await RoomRepository.getRoomByCode(roomCode);
    if (!room) throw new Error("Room not found");

    const { data, error } = await supabaseAdmin
      .from("synchronization_logs")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getSummary(roomCode) {
    const logs = await this.getLogs(roomCode, 1000);
    const total = logs.length;

    const latencySum = logs.reduce((sum, row) => sum + Number(row.latency || 0), 0);
    const reconciliationCount = logs.filter((row) => row.reconciliation_required).length;
    const mismatchCount = logs.filter((row) => Number(row.score_difference || 0) !== 0).length;

    const byMode = logs.reduce((acc, row) => {
      const mode = row.sync_mode || "unknown";
      if (!acc[mode]) acc[mode] = { count: 0, latencyTotal: 0, reconciliations: 0 };
      acc[mode].count += 1;
      acc[mode].latencyTotal += Number(row.latency || 0);
      if (row.reconciliation_required) acc[mode].reconciliations += 1;
      return acc;
    }, {});

    Object.keys(byMode).forEach((mode) => {
      byMode[mode].averageLatencyMs = byMode[mode].count
        ? Math.round(byMode[mode].latencyTotal / byMode[mode].count)
        : 0;
      delete byMode[mode].latencyTotal;
    });

    return {
      totalEvents: total,
      averageLatencyMs: total ? Math.round(latencySum / total) : 0,
      reconciliationCount,
      mismatchCount,
      byMode
    };
  }
}

module.exports = new SyncRepository();
