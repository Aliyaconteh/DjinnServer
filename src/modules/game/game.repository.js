const { supabaseAdmin } = require("../../config/supabase.config");
const RoomRepository = require("../rooms/room.repository");

class GameRepository {
  async createSession(data) {
    const { data: session, error } = await supabaseAdmin
      .from("game_sessions")
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return session;
  }

  async updateSessionQuestion(roomId, currentQuestionIndex) {
    const { data, error } = await supabaseAdmin
      .from("game_sessions")
      .update({ current_question_index: currentQuestionIndex })
      .eq("room_id", roomId)
      .eq("status", "running")
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async endSession(roomCode) {
    const room = await RoomRepository.getRoomByCode(roomCode);
    if (!room) throw new Error("Room not found");

    const { data, error } = await supabaseAdmin
      .from("game_sessions")
      .update({
        status: "ended",
        ended_at: new Date()
      })
      .eq("room_id", room.id)
      .eq("status", "running")
      .select();

    if (error) throw error;
    return data;
  }

  async getSession(roomCode) {
    const room = await RoomRepository.getRoomByCode(roomCode);
    if (!room) throw new Error("Room not found");

    const { data, error } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("room_id", room.id)
      .single();

    if (error) throw error;
    return data;
  }

  async saveAnswer(answerData) {
    const { data, error } = await supabaseAdmin
      .from("answers")
      .upsert([answerData], { onConflict: "room_id,player_id,question_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async saveSyncLog(logData) {
    const { data, error } = await supabaseAdmin
      .from("synchronization_logs")
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new GameRepository();
