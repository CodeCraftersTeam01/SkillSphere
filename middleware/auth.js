const jwt = require('jsonwebtoken');
const { User, UserProfile } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026_production_ready';

/**
 * Middleware to authenticate requests using JWT Access Token
 */
const authenticateJWT = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token otentikasi tidak ditemukan.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [{ model: UserProfile, as: 'profile' }],
      attributes: { exclude: ['password', 'refresh_token'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak valid atau sudah dihapus.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token telah kadaluarsa. Silakan refresh token atau login ulang.',
        isExpired: true,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token otentikasi tidak valid.',
    });
  }
};

/**
 * Middleware to authorize specific user roles (RBAC)
 * @param  {...string} roles - e.g. 'admin', 'tutor', 'student'
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Otentikasi diperlukan.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Peran '${req.user.role}' tidak memiliki izin untuk tindakan ini.`,
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware for public endpoints with personalized data
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password', 'refresh_token'] },
      });
      if (user && user.is_active) {
        req.user = user;
      }
    }
  } catch (err) {
    // Silently ignore invalid tokens for optional auth
    req.user = null;
  }
  next();
};

module.exports = {
  authenticateJWT,
  authorizeRoles,
  optionalAuth,
};
