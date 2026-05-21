const SyncRepository = require("./sync.repository");

class SyncController {
  async getLogs(req, res) {
    try {
      const limit = Math.min(Number(req.query.limit || 100), 1000);
      const data = await SyncRepository.getLogs(req.params.roomCode, limit);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }

  async getSummary(req, res) {
    try {
      const data = await SyncRepository.getSummary(req.params.roomCode);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }
}

module.exports = new SyncController();
