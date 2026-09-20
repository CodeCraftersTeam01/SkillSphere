const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, UserProfile, TutorWallet, sequelize } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026_production_ready';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'skillsphere_super_secret_refresh_jwt_key_2026';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Helper to generate access and refresh tokens
 */
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

/**
 * Register User (Student or Tutor)
 */
const register = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, password, role = 'student', phone_number, career_goal } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar. Silakan login atau gunakan email lain.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'student',
      is_active: true,
    }, { transaction: t });

    // Automatically create user profile
    await UserProfile.create({
      user_id: newUser.id,
      full_name: name.trim(),
      phone_number: phone_number || null,
      career_goal: career_goal || null,
    }, { transaction: t });

    // If role is tutor, automatically initialize virtual wallet
    if (newUser.role === 'tutor') {
      await TutorWallet.create({
        tutor_id: newUser.id,
        balance: 0.00,
        pending_balance: 0.00,
      }, { transaction: t });
    }

    const { accessToken, refreshToken } = generateTokens(newUser);
    await newUser.update({ refresh_token: refreshToken }, { transaction: t });

    await t.commit();

    const userWithProfile = await User.findByPk(newUser.id, {
      include: [
        { model: UserProfile, as: 'profile' },
        ...(newUser.role === 'tutor' ? [{ model: TutorWallet, as: 'wallet' }] : []),
      ],
      attributes: { exclude: ['password', 'refresh_token'] },
    });

    return res.status(201).json({
      success: true,
      message: 'Registrasi akun berhasil!',
      data: {
        user: userWithProfile,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error('Error during registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat registrasi.',
      error: error.message,
    });
  }
};

/**
 * Login User
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      where: { email: normalizedEmail },
      include: [
        { model: UserProfile, as: 'profile' },
        { model: TutorWallet, as: 'wallet', required: false },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Kombinasi email atau password salah.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda dinonaktifkan. Hubungi admin.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Kombinasi email atau password salah.',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await user.update({ refresh_token: refreshToken });

    // Set cookie if needed for browser clients
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    const userSanitized = user.toJSON();
    delete userSanitized.password;
    delete userSanitized.refresh_token;

    return res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      data: {
        user: userSanitized,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat login.',
      error: error.message,
    });
  }
};

/**
 * Get Current Logged In User Profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: UserProfile, as: 'profile' },
        ...(req.user.role === 'tutor' ? [{ model: TutorWallet, as: 'wallet' }] : []),
      ],
      attributes: { exclude: ['password', 'refresh_token'] },
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data profil.',
      error: error.message,
    });
  }
};

/**
 * Update Profile
 */
const updateProfile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, full_name, bio, phone_number, avatar_url, career_goal, study_preferences } = req.body;
    const userId = req.user.id;

    if (name) {
      await User.update({ name: name.trim() }, { where: { id: userId }, transaction: t });
    }

    let profile = await UserProfile.findOne({ where: { user_id: userId }, transaction: t });
    if (!profile) {
      profile = await UserProfile.create({
        user_id: userId,
        full_name: full_name || name || '',
        bio,
        phone_number,
        avatar_url,
        career_goal,
        study_preferences,
      }, { transaction: t });
    } else {
      await profile.update({
        full_name: full_name !== undefined ? full_name : profile.full_name,
        bio: bio !== undefined ? bio : profile.bio,
        phone_number: phone_number !== undefined ? phone_number : profile.phone_number,
        avatar_url: avatar_url !== undefined ? avatar_url : profile.avatar_url,
        career_goal: career_goal !== undefined ? career_goal : profile.career_goal,
        study_preferences: study_preferences !== undefined ? study_preferences : profile.study_preferences,
      }, { transaction: t });
    }

    await t.commit();

    const updatedUser = await User.findByPk(userId, {
      include: [{ model: UserProfile, as: 'profile' }],
      attributes: { exclude: ['password', 'refresh_token'] },
    });

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      data: updatedUser,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui profil.',
      error: error.message,
    });
  }
};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    const isMatch = await bcrypt.compare(current_password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini tidak cocok.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await user.update({ password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: 'Password berhasil diubah. Silakan login kembali dengan password baru jika diperlukan.',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah password.',
      error: error.message,
    });
  }
};

/**
 * Refresh Access Token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token diperlukan.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token tidak valid atau telah kadaluarsa.',
      });
    }

    const user = await User.findOne({
      where: {
        id: decoded.id,
        refresh_token: token,
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid atau user dinonaktifkan.',
      });
    }

    const tokens = generateTokens(user);
    await user.update({ refresh_token: tokens.refreshToken });

    return res.status(200).json({
      success: true,
      message: 'Token berhasil diperbarui.',
      data: tokens,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui token.',
      error: error.message,
    });
  }
};

/**
 * Logout
 */
const logout = async (req, res) => {
  try {
    if (req.user) {
      await User.update({ refresh_token: null }, { where: { id: req.user.id } });
    }
    res.clearCookie('token');

    return res.status(200).json({
      success: true,
      message: 'Logout berhasil.',
    });
  } catch (error) {
    console.error('Error logout:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal logout.',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
};
