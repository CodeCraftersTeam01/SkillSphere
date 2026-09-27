const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, UserProfile, TutorWallet, TutorApplication, TutorCertification, sequelize } = require('../models');
const { sendOTPEmail } = require('../config/mailer');
const { processAndConvertToWebP } = require('../utils/imageHelper');

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
    const { email, otp } = req.body;

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

    if (user.is_verified) {
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

    const userSanitized = user.toJSON();
    delete userSanitized.password;
    delete userSanitized.refresh_token;
    delete userSanitized.otp_code;

    return res.status(200).json({
      success: true,
      message: 'Verifikasi email berhasil! Selamat datang di SkillSphere AI.',
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

    if (user.is_verified) {
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

    const hasCompletedOnboarding = user.role === 'admin' || Boolean(user.profile && user.profile.study_preferences && user.profile.study_preferences.onboarding_completed);

    return res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      data: {
        user: userSanitized,
        requires_onboarding: !hasCompletedOnboarding,
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

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  getProfile,
  updateProfile,
  uploadCertificate,
  personalize,
  changePassword,
  refreshToken,
  logout,
  oauthRedirect,
};
