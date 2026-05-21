class RoomUtils {

  // 🔑 Generate 6-digit room code
  static generateRoomCode() {
    return Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  }

  // 👤 Format player object
  static formatPlayer(user) {
    return {
      id: user.id,
      username: user.username || "Anonymous",
      joinedAt: new Date()
    };
  }

  // 📊 Calculate player count
  static getPlayerCount(players = []) {
    return players.length;
  }

  // 🎯 Validate room code
  static isValidRoomCode(code) {
    return typeof code === "string" && code.length === 6;
  }

  static resolveDelay(level = "low", customMs) {
    const presets = {
      low: 0,
      medium: 200,
      high: 600
    };

    if (level === "custom") {
      const ms = Number(customMs);
      if (!Number.isInteger(ms) || ms < 0 || ms > 5000) {
        throw new Error("Custom delay must be an integer between 0 and 5000ms");
      }
      return { level, ms };
    }

    if (!Object.prototype.hasOwnProperty.call(presets, level)) {
      throw new Error("delayLevel must be low, medium, high, or custom");
    }

    return { level, ms: presets[level] };
  }
}

module.exports = RoomUtils;
