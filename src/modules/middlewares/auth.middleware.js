const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;

  if (!header || typeof header !== 'string') {
    return res.status(401).json({ message: 'Unauthorized: missing token' });
  }

  const [scheme, token] = header.split(' ');

  if (!token || scheme.toLowerCase() !== 'bearer') {
    return res.status(401).json({ message: 'Unauthorized: invalid token format' });
  }

  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_TOKEN_SECRET;

  if (!secret) {
    return res.status(500).json({ message: 'Server misconfiguration: JWT secret not set' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: invalid or expired token' });
  }
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.authenticateToken = authMiddleware;
module.exports.isAuthenticated = authMiddleware;
module.exports.protect = authMiddleware;
