const AuthService = require("../modules/auth/auth.service");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const user = await AuthService.getUser(token);

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (user.role !== "host") {
      return res.status(403).json({ message: "Host access required" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: err.message || "Unauthorized" });
  }
};

module.exports = authMiddleware;