const AuthService = require("./auth.service");

class AuthController {
  async signup(req, res) {
    try {
      const { email, password, username } = req.body;

      if (!email || !password || !username) {
        return res.status(400).json({
          success: false,
          message: "Email, password, and username are required"
        });
      }

      const data = await AuthService.signup(email, password, username);

      return res.status(201).json({
        success: true,
        data
      });
    } catch (err) {
      console.error("Signup failed:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
        cause: err.cause?.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      const data = await AuthService.login(email, password);

      return res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error("Login failed:", err);
      return res.status(401).json({
        success: false,
        message: err.message,
        cause: err.cause?.message
      });
    }
  }

  async googleLogin(req, res) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: "Google access token is required"
        });
      }

      const data = await AuthService.loginWithGoogle(accessToken);

      return res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error("Google login failed:", err);
      return res.status(401).json({
        success: false,
        message: err.message,
        cause: err.cause?.message
      });
    }
  }

  async me(req, res) {
    try {
      return res.json({
        success: true,
        data: req.user
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { username } = req.body;
      const data = await AuthService.updateProfile(req.user.id, username);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const data = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AuthController();
