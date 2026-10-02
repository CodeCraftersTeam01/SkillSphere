const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, UserProfile, TutorWallet, TutorApplication, TutorCertification, UserDevice, sequelize } = require('../models');
const { sendOTPEmail } = require('../config/mailer');
const { processAndConvertToWebP } = require('../utils/imageHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026_production_ready';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'skillsphere_super_secret_refresh_jwt_key_2026';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Helper to parse browser and OS info from User-Agent
 */
const parseDeviceInfo = (userAgent = '', clientIp = '') => {
  let browser = 'Browser Web';
  let os = 'Sistem Operasi';

  if (/edg/i.test(userAgent)) {
    browser = 'Microsoft Edge';
  } else if (/opr\/|opera/i.test(userAgent)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(userAgent)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(userAgent)) {
    browser = 'Apple Safari';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'Mozilla Firefox';
  }

  if (/macintosh|mac os x/i.test(userAgent)) {
    os = 'macOS';
  } else if (/windows nt/i.test(userAgent)) {
    os = 'Windows';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  }

  const deviceName = `${browser} (${os})`;
  return { browser, os, deviceName, ipAddress: clientIp };
};

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
 * Register User (Student or Tutor) and Send OTP
 */
const register = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, password, role = 'student', phone_number, career_goal } = req.body;

    const trimmedName = (name || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Check duplicate email
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      await t.rollback();
      // If user registered but not verified yet, resend OTP
      if (!existingUser.is_verified) {
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await existingUser.update({ otp_code: newOtp, otp_expires_at: expiresAt });
        await sendOTPEmail(normalizedEmail, newOtp, existingUser.name);

        return res.status(200).json({
          success: true,
          requireOtp: true,
          message: 'Akun Anda belum diverifikasi. Kode OTP baru telah dikirim ke email Anda.',
          data: { email: normalizedEmail },
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar. Silakan login atau gunakan email lain.',
      });
    }

    // 2. Check duplicate name (case-insensitive check)
    const existingNameUser = await User.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        trimmedName.toLowerCase()
      ),
    });

    if (existingNameUser) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: `Nama "${trimmedName}" sudah digunakan oleh akun lain. Silakan gunakan nama lengkap Anda yang berbeda.`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'student',
      is_active: false, // Activated after OTP verification
      is_verified: false,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt,
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

    await t.commit();

    // Send OTP via SMTP
    await sendOTPEmail(normalizedEmail, otpCode, newUser.name);

    return res.status(201).json({
      success: true,
      requireOtp: true,
      message: 'Pendaftaran berhasil! Kode verifikasi OTP telah dikirimkan ke email Anda.',
      data: {
        email: normalizedEmail,
        name: newUser.name,
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
 * Verify OTP Code
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, device_id, deviceId, device_name } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email dan kode OTP wajib diisi.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      where: { email: normalizedEmail },
      include: [
        { model: UserProfile, as: 'profile' },
        { model: TutorWallet, as: 'wallet', required: false },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Akun dengan email tersebut tidak ditemukan.',
      });
    }

    if (user.is_verified && !user.two_factor_enabled && !user.otp_code) {
      return res.status(400).json({
        success: false,
        message: 'Akun ini sudah terverifikasi sebelumnya. Silakan langsung login.',
      });
    }

    // Verify OTP code and expiration
    if (!user.otp_code || user.otp_code.trim() !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Kode OTP salah. Harap periksa kembali email Anda.',
      });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Kode OTP telah kadaluarsa. Silakan minta kode OTP baru.',
      });
    }

    // Activate and verify user
    const { accessToken, refreshToken } = generateTokens(user);

    await user.update({
      is_verified: true,
      is_active: true,
      otp_code: null,
      otp_expires_at: null,
      refresh_token: refreshToken,
    });

    // Register / trust the device in database upon successful OTP verification
    const activeDeviceId = device_id || deviceId;
    if (activeDeviceId) {
      const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
      const userAgent = req.headers['user-agent'] || '';
      const parsedDevice = parseDeviceInfo(userAgent, clientIp);
      const activeDeviceName = device_name || parsedDevice.deviceName;

      const [device] = await UserDevice.findOrCreate({
        where: { user_id: user.id, device_id: String(activeDeviceId).trim() },
        defaults: {
          user_id: user.id,
          device_id: String(activeDeviceId).trim(),
          device_name: activeDeviceName,
          browser: parsedDevice.browser,
          os: parsedDevice.os,
          ip_address: clientIp,
          user_agent: userAgent,
          is_trusted: true,
          last_login_at: new Date(),
        },
      });

      if (device) {
        await device.update({
          is_trusted: true,
          last_login_at: new Date(),
          ip_address: clientIp,
          user_agent: userAgent,
          device_name: activeDeviceName,
        });
      }
    }

    const userSanitized = user.toJSON();
    delete userSanitized.password;
    delete userSanitized.refresh_token;
    delete userSanitized.otp_code;

    return res.status(200).json({
      success: true,
      message: 'Verifikasi berhasil! Perangkat telah diverifikasi.',
      data: {
        user: userSanitized,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi kode OTP.',
      error: error.message,
    });
  }
};

/**
 * Resend OTP Code
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email wajib diisi.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Akun dengan email tersebut tidak ditemukan.',
      });
    }

    if (user.is_verified && !user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: 'Akun sudah terverifikasi. Silakan langsung login.',
      });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      otp_code: newOtp,
      otp_expires_at: otpExpiresAt,
    });

    await sendOTPEmail(normalizedEmail, newOtp, user.name);

    return res.status(200).json({
      success: true,
      message: 'Kode OTP baru telah berhasil dikirim ke email Anda.',
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim ulang kode OTP.',
      error: error.message,
    });
  }
};

/**
 * Login User with Intelligent Device Recognition & 2FA
 */
const login = async (req, res) => {
  try {
    const { email, password, device_id, deviceId, device_name } = req.body;
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Kombinasi email atau password salah.',
      });
    }

    if (!user.is_verified) {
      let activeOtp = user.otp_code;
      if (!activeOtp || (user.otp_expires_at && new Date() > new Date(user.otp_expires_at))) {
        activeOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.update({ otp_code: activeOtp, otp_expires_at: otpExpiresAt });
        await sendOTPEmail(normalizedEmail, activeOtp, user.name);
      }

      return res.status(403).json({
        success: false,
        requireOtp: true,
        email: normalizedEmail,
        name: user.name,
        role: user.role,
        message: 'Akun Anda belum menyelesaikan verifikasi OTP. Silakan masukkan 6 digit kode OTP yang telah dikirim ke email.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda dinonaktifkan. Hubungi admin.',
      });
    }

    // Extract device metadata
    const rawDeviceId = device_id || deviceId || req.headers['x-device-id'] || null;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
    const userAgent = req.headers['user-agent'] || '';
    const parsedDevice = parseDeviceInfo(userAgent, clientIp);
    const activeDeviceName = device_name || parsedDevice.deviceName;

    // Check Two-Factor Authentication (2FA) with Device Awareness
    if (user.two_factor_enabled) {
      let trustedDevice = null;
      if (rawDeviceId) {
        trustedDevice = await UserDevice.findOne({
          where: {
            user_id: user.id,
            device_id: String(rawDeviceId).trim(),
            is_trusted: true,
          },
        });
      }

      // If device is already registered and trusted, bypass 2FA OTP!
      if (trustedDevice) {
        await trustedDevice.update({
          last_login_at: new Date(),
          ip_address: clientIp,
          user_agent: userAgent,
          device_name: activeDeviceName || trustedDevice.device_name,
        });
      } else {
        // Device is NOT recognized / new device -> Trigger 2FA OTP
        const activeOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.update({ otp_code: activeOtp, otp_expires_at: otpExpiresAt });
        await sendOTPEmail(normalizedEmail, activeOtp, user.name);

        return res.status(200).json({
          success: true,
          requireOtp: true,
          isTwoFactor: true,
          isNewDevice: true,
          deviceId: rawDeviceId,
          email: normalizedEmail,
          name: user.name,
          role: user.role,
          message: 'Perangkat baru terdeteksi. Silakan masukkan kode verifikasi OTP 6 digit yang dikirim ke email Anda untuk mengonfirmasi perangkat ini.',
        });
      }
    } else {
      // 2FA disabled: Record or update device history
      if (rawDeviceId) {
        const [dev] = await UserDevice.findOrCreate({
          where: { user_id: user.id, device_id: String(rawDeviceId).trim() },
          defaults: {
            user_id: user.id,
            device_id: String(rawDeviceId).trim(),
            device_name: activeDeviceName,
            browser: parsedDevice.browser,
            os: parsedDevice.os,
            ip_address: clientIp,
            user_agent: userAgent,
            is_trusted: true,
            last_login_at: new Date(),
          },
        });
        if (dev) {
          await dev.update({
            last_login_at: new Date(),
            ip_address: clientIp,
            user_agent: userAgent,
            device_name: activeDeviceName,
          });
        }
      }
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
    delete userSanitized.otp_code;

    const hasCompletedOnboarding = user.role === 'admin' || user.role === 'tutor' || Boolean(user.profile && user.profile.study_preferences && user.profile.study_preferences.onboarding_completed);

    return res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      data: {
        user: userSanitized,
        requires_onboarding: user.role === 'student' ? !hasCompletedOnboarding : false,
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
        { model: TutorApplication, as: 'tutor_applications' },
        { model: TutorCertification, as: 'tutor_certifications' },
        ...(req.user.role === 'tutor' ? [{ model: TutorWallet, as: 'wallet' }] : []),
      ],
      attributes: { exclude: ['password', 'refresh_token', 'otp_code'] },
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
    const { name, full_name, bio, phone_number, avatar_url, career_goal, study_preferences, two_factor_enabled } = req.body;
    const userId = req.user.id;

    const userUpdateData = {};
    if (name) userUpdateData.name = name.trim();
    if (two_factor_enabled !== undefined) {
      userUpdateData.two_factor_enabled = Boolean(two_factor_enabled);
    }
    if (Object.keys(userUpdateData).length > 0) {
      await User.update(userUpdateData, { where: { id: userId }, transaction: t });
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
      attributes: { exclude: ['password', 'refresh_token', 'otp_code'] },
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
 * Upload & Update Profile Avatar (Sharp WebP)
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Berkas gambar avatar wajib diunggah.',
      });
    }

    const { relativeUrl } = await processAndConvertToWebP(req.file.buffer, 'avatars', {
      maxWidth: 400,
      maxHeight: 400,
      quality: 85,
    });

    const userId = req.user.id;
    let profile = await UserProfile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await UserProfile.create({
        user_id: userId,
        full_name: req.user.name,
        avatar_url: relativeUrl,
      });
    } else {
      await profile.update({ avatar_url: relativeUrl });
    }

    return res.status(200).json({
      success: true,
      message: 'Foto profil berhasil diperbarui.',
      data: {
        avatar_url: relativeUrl,
      },
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengunggah foto profil.',
      error: error.message,
    });
  }
};

/**
 * Toggle Two-Factor Authentication (2FA)
 */
const toggleTwoFactor = async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    const isEnabled = enabled === true || enabled === 'true' || enabled === 1;
    await user.update({ two_factor_enabled: isEnabled });

    return res.status(200).json({
      success: true,
      message: isEnabled
        ? 'Autentikasi 2-Faktor (2FA) berhasil diaktifkan. Setiap login akan memerlukan verifikasi kode OTP email.'
        : 'Autentikasi 2-Faktor (2FA) dinonaktifkan.',
      data: {
        two_factor_enabled: isEnabled,
      },
    });
  } catch (error) {
    console.error('Error toggling 2FA:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah pengaturan Autentikasi 2-Faktor.',
      error: error.message,
    });
  }
};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, old_password, new_password } = req.body;
    const currentPass = current_password || old_password;
    const userId = req.user.id;

    if (!currentPass || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Kata sandi saat ini dan kata sandi baru wajib diisi.',
      });
    }

    const user = await User.findByPk(userId);
    const isMatch = await bcrypt.compare(currentPass, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Kata sandi saat ini tidak cocok.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await user.update({ password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: 'Kata sandi berhasil diubah. Silakan gunakan kata sandi baru untuk login selanjutnya.',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah kata sandi.',
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

/**
 * Upload and Compress Supporting Certificate to WebP format
 */
const uploadCertificate = async (req, res) => {
  try {
    let inputSource = null;

    if (req.file && req.file.buffer) {
      inputSource = req.file.buffer;
    } else if (req.body && req.body.image) {
      inputSource = req.body.image;
    }

    if (!inputSource) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada file gambar sertifikat yang diunggah.',
      });
    }

    // Process & compress into lightweight WebP format without losing crisp quality
    const result = await processAndConvertToWebP(inputSource, 'certificates', {
      quality: 84,
      maxWidth: 2048,
      maxHeight: 2048,
    });

    return res.status(200).json({
      success: true,
      message: 'Sertifikat berhasil diproses dan dikompresi ke WebP!',
      data: {
        url: result.relativeUrl,
        filename: result.filename,
        originalSizeKB: Math.round(result.originalSize / 1024),
        compressedSizeKB: Math.round(result.compressedSize / 1024),
        savingsPercent: result.savingsPercent,
      },
    });
  } catch (error) {
    console.error('Error in uploadCertificate:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses gambar sertifikat.',
      error: error.message,
    });
  }
};

/**
 * Save User Personalization / Onboarding Preferences (Student & Tutor)
 */
const personalize = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      // Student specific
      education_status,
      age_range,
      career_goal,
      learning_style,
      weekly_commitment,
      // Tutor specific
      specialization,
      institution_name,
      experience_years,
      certificate_name,
      issuer,
      credential_url,
      certificate_file_url,
      certificate_image_base64,
      linkedin_url,
      portfolio_url,
      weekly_teaching_commitment,
    } = req.body;

    // Process certificate image if base64 provided
    let finalCertificateUrl = certificate_file_url || credential_url || null;
    if (certificate_image_base64 && (!finalCertificateUrl || finalCertificateUrl.startsWith('data:'))) {
      try {
        const compressed = await processAndConvertToWebP(certificate_image_base64, 'certificates', {
          quality: 84,
          maxWidth: 2048,
          maxHeight: 2048,
        });
        finalCertificateUrl = compressed.relativeUrl;
      } catch (imgErr) {
        console.warn('Failed to compress base64 certificate image:', imgErr.message);
      }
    }

    const study_preferences = {
      role: userRole,
      education_status: education_status || null,
      age_range: age_range || null,
      career_goal: career_goal || specialization || null,
      learning_style: learning_style || null,
      weekly_commitment: weekly_commitment || weekly_teaching_commitment || null,
      specialization: specialization || null,
      institution_name: institution_name || null,
      experience_years: experience_years ? parseInt(experience_years) : 0,
      certificate_name: certificate_name || null,
      issuer: issuer || null,
      credential_url: finalCertificateUrl,
      certificate_file_url: finalCertificateUrl,
      linkedin_url: linkedin_url ? linkedin_url.trim() : null,
      portfolio_url: portfolio_url ? portfolio_url.trim() : null,
      onboarding_completed: true,
      completed_at: new Date(),
    };

    let profile = await UserProfile.findOne({ where: { user_id: userId }, transaction: t });
    if (!profile) {
      profile = await UserProfile.create({
        user_id: userId,
        career_goal: career_goal || specialization || null,
        linkedin_url: linkedin_url ? linkedin_url.trim() : null,
        portfolio_url: portfolio_url ? portfolio_url.trim() : null,
        study_preferences,
      }, { transaction: t });
    } else {
      await profile.update({
        career_goal: career_goal || specialization || profile.career_goal,
        linkedin_url: linkedin_url ? linkedin_url.trim() : profile.linkedin_url,
        portfolio_url: portfolio_url ? portfolio_url.trim() : profile.portfolio_url,
        study_preferences,
      }, { transaction: t });
    }

    // If role is tutor, create or update TutorApplication and optional TutorCertification
    if (userRole === 'tutor') {
      let application = await TutorApplication.findOne({ where: { user_id: userId }, transaction: t });
      if (!application) {
        await TutorApplication.create({
          user_id: userId,
          institution_name: institution_name || null,
          experience_years: experience_years ? parseInt(experience_years) : 0,
          certificate_document_url: finalCertificateUrl,
          linkedin_url: linkedin_url ? linkedin_url.trim() : null,
          portfolio_url: portfolio_url ? portfolio_url.trim() : null,
          status: 'pending',
        }, { transaction: t });
      } else {
        await application.update({
          institution_name: institution_name || application.institution_name,
          experience_years: experience_years ? parseInt(experience_years) : application.experience_years,
          certificate_document_url: finalCertificateUrl || application.certificate_document_url,
          linkedin_url: linkedin_url ? linkedin_url.trim() : application.linkedin_url,
          portfolio_url: portfolio_url ? portfolio_url.trim() : application.portfolio_url,
        }, { transaction: t });
      }

      if (certificate_name && issuer) {
        await TutorCertification.create({
          tutor_id: userId,
          certificate_name: certificate_name.trim(),
          issuer: issuer.trim(),
          credential_url: finalCertificateUrl,
          is_verified: false,
        }, { transaction: t });
      }
    }

    await t.commit();

    const updatedUser = await User.findByPk(userId, {
      include: [
        { model: UserProfile, as: 'profile' },
        ...(userRole === 'tutor' ? [{ model: TutorWallet, as: 'wallet' }] : []),
      ],
      attributes: { exclude: ['password', 'refresh_token', 'otp_code'] },
    });

    return res.status(200).json({
      success: true,
      message: 'Personalisasi profil berhasil disimpan!',
      data: updatedUser,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error saving personalization:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan personalisasi profil.',
      error: error.message,
    });
  }
};

/**
 * Apply or Re-apply for Tutor Verification
 */
const applyTutor = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const {
      institution_name,
      experience_years,
      cv_url,
      portfolio_url,
      linkedin_url,
      certificate_document_url,
      motivation_letter,
    } = req.body;

    let application = await TutorApplication.findOne({
      where: { user_id: userId },
      transaction: t,
    });

    if (!application) {
      application = await TutorApplication.create({
        user_id: userId,
        institution_name: institution_name || null,
        experience_years: experience_years ? parseInt(experience_years) : 0,
        cv_url: cv_url || null,
        portfolio_url: portfolio_url || null,
        linkedin_url: linkedin_url || null,
        certificate_document_url: certificate_document_url || null,
        status: 'pending',
        rejection_reason: null,
      }, { transaction: t });
    } else {
      await application.update({
        institution_name: institution_name !== undefined ? institution_name : application.institution_name,
        experience_years: experience_years !== undefined ? parseInt(experience_years) : application.experience_years,
        cv_url: cv_url !== undefined ? cv_url : application.cv_url,
        portfolio_url: portfolio_url !== undefined ? portfolio_url : application.portfolio_url,
        linkedin_url: linkedin_url !== undefined ? linkedin_url : application.linkedin_url,
        certificate_document_url: certificate_document_url !== undefined ? certificate_document_url : application.certificate_document_url,
        status: 'pending',
        rejection_reason: null,
      }, { transaction: t });
    }

    if (motivation_letter) {
      let profile = await UserProfile.findOne({ where: { user_id: userId }, transaction: t });
      if (profile) {
        await profile.update({ bio: motivation_letter }, { transaction: t });
      }
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Pengajuan verifikasi pengajar berhasil dikirim! Tim Admin akan segera meninjau berkas Anda.',
      data: application,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error applying for tutor:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengajukan verifikasi pengajar.',
      error: error.message,
    });
  }
};

/**
 * OAuth Provider Redirection & Informative Handler
 */
const oauthRedirect = async (req, res) => {
  const { provider } = req.params;
  const { role = 'student' } = req.query;

  const normalizedProvider = (provider || '').toLowerCase();
  if (!['google', 'github'].includes(normalizedProvider)) {
    return res.status(400).json({
      success: false,
      message: `Penyedia OAuth '${provider}' tidak didukung. Gunakan Google atau GitHub.`,
    });
  }

  const clientId = normalizedProvider === 'google' 
    ? process.env.GOOGLE_CLIENT_ID 
    : process.env.GITHUB_CLIENT_ID;

  if (!clientId || clientId.includes('your_')) {
    const providerTitle = normalizedProvider === 'google' ? 'Google' : 'GitHub';
    return res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OAuth ${providerTitle} | SkillSphere AI</title>
        <link rel="stylesheet" href="/stylesheets/claude-theme.css">
      </head>
      <body style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; font-family:var(--font-sans); background:var(--bg-app);">
        <div class="login-card" style="max-width:460px; text-align:center; padding:36px 28px;">
          <div style="font-size:42px; margin-bottom:14px;">🔑</div>
          <h2 style="font-family:var(--font-serif); font-size:23px; margin-bottom:12px; color:var(--text-primary);">Integrasi OAuth ${providerTitle}</h2>
          <p style="color:var(--text-secondary); font-size:14px; line-height:1.5; margin-bottom:24px;">
            Tombol <strong>${providerTitle}</strong> telah terpasang dengan rapi. Untuk menghubungkan akun ke sistem OAuth resmi, tambahkan <code>${providerTitle.toUpperCase()}_CLIENT_ID</code> dan <code>${providerTitle.toUpperCase()}_CLIENT_SECRET</code> pada file <code>.env</code> Anda.
          </p>
          <a href="/login" class="submit-btn" style="text-decoration:none; display:inline-flex;">Kembali ke Halaman Masuk</a>
        </div>
      </body>
      </html>
    `);
  }

  if (normalizedProvider === 'google') {
    const redirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/api/auth/oauth/google/callback`);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=${role}`;
    return res.redirect(googleAuthUrl);
  } else {
    const redirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/api/auth/oauth/github/callback`);
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${role}`;
    return res.redirect(githubAuthUrl);
  }
};

/**
 * Get list of trusted devices for authenticated user
 */
const getTrustedDevices = async (req, res) => {
  try {
    const devices = await UserDevice.findAll({
      where: { user_id: req.user.id },
      order: [['last_login_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('Error fetching trusted devices:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar perangkat.',
      error: error.message,
    });
  }
};

/**
 * Revoke / remove a trusted device
 */
const revokeTrustedDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await UserDevice.destroy({
      where: {
        id,
        user_id: req.user.id,
      },
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Perangkat tidak ditemukan atau sudah dihapus.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Akses perangkat berhasil dicabut.',
    });
  } catch (error) {
    console.error('Error revoking device:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mencabut akses perangkat.',
      error: error.message,
    });
  }
};

/**
 * Revoke all other trusted devices
 */
const revokeAllOtherDevices = async (req, res) => {
  try {
    const currentDeviceId = req.query.current_device_id || req.body.current_device_id;
    const whereClause = { user_id: req.user.id };
    if (currentDeviceId) {
      whereClause.device_id = { [Op.ne]: currentDeviceId };
    }

    await UserDevice.destroy({ where: whereClause });

    return res.status(200).json({
      success: true,
      message: 'Semua sesi perangkat lain berhasil dicabut.',
    });
  } catch (error) {
    console.error('Error revoking other devices:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mencabut sesi perangkat lain.',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  getProfile,
  updateProfile,
  uploadAvatar,
  toggleTwoFactor,
  uploadCertificate,
  personalize,
  changePassword,
  refreshToken,
  logout,
  oauthRedirect,
  applyTutor,
  getTrustedDevices,
  revokeTrustedDevice,
  revokeAllOtherDevices,
};
