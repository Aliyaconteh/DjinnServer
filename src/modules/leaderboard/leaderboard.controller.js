const LeaderboardService = require("./leaderboard.service");

const leaderboardService = new LeaderboardService({ to: () => ({ emit: () => {} }) });

class LeaderboardController {
  async getLive(req, res) {
    try {
      const data = await leaderboardService.getPersisted(req.params.roomCode);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }

  async getFinal(req, res) {
    try {
      const data = await leaderboardService.getFinalResults(req.params.roomCode);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }
}

module.exports = new LeaderboardController();
