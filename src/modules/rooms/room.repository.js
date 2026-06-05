const { supabaseAdmin } = require("../../config/supabase.config");

class RoomRepository {

  async createRoom(roomData) {
  console.debug("ROOM DATA SENT TO_SUPABASE:", roomData);

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert([roomData])
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }

  return data;
}
  async getRoomByCode(roomCode) {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (error) return null;
    return data;
  }

  async getRoomsByHost(hostId) {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("host_id", hostId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async addPlayer(roomId, player) {
    const { data, error } = await supabaseAdmin
      .from("room_players")
      .insert([{ room_id: roomId, ...player }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPlayerByUsername(roomId, username) {
    const { data, error } = await supabaseAdmin
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .ilike("username", username)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getPlayers(roomId) {
    const { data, error } = await supabaseAdmin
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (error) throw error;
    return data;
  }

  async getPlayerById(roomId, playerId) {
    const { data, error } = await supabaseAdmin
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .eq("id", playerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getPlayerByUserId(roomId, userId) {
    const { data, error } = await supabaseAdmin
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateStatus(roomCode, status) {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .update({ status })
      .eq("room_code", roomCode)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new RoomRepository();

