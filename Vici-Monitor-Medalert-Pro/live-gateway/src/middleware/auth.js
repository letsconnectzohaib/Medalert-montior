const jwt = require('jsonwebtoken');

function signToken(user, secret) {
  return jwt.sign(user, secret, { expiresIn: '12h' });
}

function verifyBearerToken(req, secret) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function requireAuth(secret) {
  return (req, res, next) => {
    const user = verifyBearerToken(req, secret);
    if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
    req.user = user;
    return next();
  };
}

function verifyWsMessageToken(msg, secret) {
  if (!msg || typeof msg !== 'object') return null;
  const token = typeof msg.token === 'string' ? msg.token : '';
  if (!token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

module.exports = {
  signToken,
  requireAuth,
  verifyWsMessageToken
};

