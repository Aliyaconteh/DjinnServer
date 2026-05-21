const { supabaseAdmin } = require("../../config/supabase.config");
const RoomRepository = require("../rooms/room.repository");

class LeaderboardRepository {
  async upsertScore(roomId, playerId, userId, score, rank = null) {
    const { data, error } = await supabaseAdmin
      .from("leaderboard")
      .upsert({
        room_id: roomId,
        player_id: playerId,
        user_id: userId || null,
        score,
        rank,
        updated_at: new Date()
      }, { onConflict: "room_id,player_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getByRoomCode(roomCode) {
    const room = await RoomRepository.getRoomByCode(roomCode);
    if (!room) throw new Error("Room not found");

    const { data, error } = await supabaseAdmin
      .from("leaderboard")
      .select("*")
      .eq("room_id", room.id)
      .order("score", { ascending: false });

    if (error) throw error;
    return data;
  }

  async getFinalResults(roomCode) {
    const room = await RoomRepository.getRoomByCode(roomCode);
    if (!room) throw new Error("Room not found");

    const { data, error } = await supabaseAdmin
      .from("session_results")
      .select("*")
      .eq("room_id", room.id)
      .order("rank", { ascending: true });

    if (error) throw error;
    return data;
  }

  async saveSessionResults(roomId, results) {
    if (!results.length) return [];

    const rows = results.map((item, index) => ({
      room_id: roomId,
      player_id: item.playerId,
      user_id: item.userId || null,
      score: item.score,
      rank: index + 1
    }));

    const { data, error } = await supabaseAdmin
      .from("session_results")
      .insert(rows)
      .select();

    if (error) throw error;
    return data;
  }
}

module.exports = new LeaderboardRepository();
