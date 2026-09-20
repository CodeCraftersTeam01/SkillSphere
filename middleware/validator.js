/**
 * Validation helpers for API endpoints
 */

const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Nama wajib diisi minimal 2 karakter.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push('Format email tidak valid.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password wajib diisi minimal 6 karakter.');
  }

  const validRoles = ['student', 'tutor'];
  if (role && !validRoles.includes(role)) {
    errors.push('Role pendaftaran hanya boleh "student" atau "tutor".');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email wajib diisi.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password wajib diisi.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      errors,
    });
  }

  next();
};

const validateProfileUpdate = (req, res, next) => {
  const { full_name, phone_number } = req.body;
  const errors = [];

  if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim().length === 0)) {
    errors.push('Nama lengkap tidak boleh kosong.');
  }

  if (phone_number !== undefined && phone_number !== null) {
    const phoneRegex = /^[0-9+-\s]{8,20}$/;
    if (!phoneRegex.test(phone_number)) {
      errors.push('Format nomor telepon tidak valid.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      errors,
    });
  }

  next();
};

const validateChangePassword = (req, res, next) => {
  const { current_password, new_password, confirm_password } = req.body;
  const errors = [];

  if (!current_password) {
    errors.push('Password saat ini wajib diisi.');
  }

  if (!new_password || new_password.length < 6) {
    errors.push('Password baru wajib diisi minimal 6 karakter.');
  }

  if (new_password !== confirm_password) {
    errors.push('Konfirmasi password baru tidak cocok.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      errors,
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateChangePassword,
};
