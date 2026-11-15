require('dotenv').config();

/**
 * WhatsApp Gateway Service for SkillSphere AI
 * Handles OTP delivery, payment receipts, tutor sales, new material notifications,
 * admin verification alerts, withdrawal status, and AI study reminders.
 */

/**
 * Normalizes Indonesian and international phone numbers into standard format (e.g. 6281234567890)
 * @param {string} phone
 * @returns {string}
 */
const normalizePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Nomor WhatsApp wajib diisi.');
  }

  // Remove whitespace, dashes, plus signs, brackets, periods
  let cleaned = phone.replace(/[\s\-\+\(\)\.]/g, '');

  // Convert local prefix 08xx to 628xx
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  // Validate format: must be all digits, between 10 and 16 digits long
  if (!/^\d{10,16}$/.test(cleaned)) {
    throw new Error('Format nomor WhatsApp tidak valid. Pastikan nomor minimal 10 digit angka.');
  }

  return cleaned;
};

/**
 * Masks phone number for secure client-side display (e.g. +6285****829)
 * @param {string} phone
 * @returns {string}
 */
const maskPhoneNumber = (phone) => {
  try {
    const normalized = normalizePhoneNumber(phone);
    if (normalized.length <= 6) return normalized;
    const start = normalized.slice(0, 4);
    const end = normalized.slice(-3);
    return `+${start}****${end}`;
  } catch (err) {
    return phone;
  }
};

/**
 * Helper to format number into IDR currency (e.g. Rp 250.000)
 * @param {number|string} amount
 * @returns {string}
 */
const formatRupiah = (amount) => {
  const num = Number(amount || 0);
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
};

/**
 * Send WhatsApp text message via External Gateway API
 * @param {string} phone
 * @param {string} message
 * @returns {Promise<{success: boolean, messageId?: string, phone: string, simulated?: boolean}>}
 */
const sendWhatsAppMessage = async (phone, message) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  // If in automated test environment or dummy test number, simulate delivery without calling external gateway
  if (process.env.NODE_ENV === 'test' || normalizedPhone.startsWith('628000') || normalizedPhone.startsWith('08000')) {
    return {
      success: true,
      simulated: true,
      messageId: `simulated-wa-${Date.now()}`,
      phone: normalizedPhone,
      maskedPhone: maskPhoneNumber(normalizedPhone),
    };
  }

  const gatewayUrl = process.env.WA_GATEWAY_URL || 'https://ubuntu.leopard-gila.ts.net/api/whatsapp/send';
  const apiKey = process.env.WA_API_KEY;

  if (!apiKey) {
    console.error('❌ [WhatsApp Gateway] WA_API_KEY belum dikonfigurasi di environment (.env).');
    throw new Error('Konfigurasi API WhatsApp belum lengkap di server.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json().catch(() => ({}));

    if (!response.ok || (result && result.success === false)) {
      const errorMsg = (result && (result.message || result.error)) || `HTTP error ${response.status}`;
      console.error(`❌ [WhatsApp Gateway] Pengiriman ke ${normalizedPhone} gagal: ${errorMsg}`);

      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 [DEV WA FALLBACK] Pesan untuk ${normalizedPhone}: \n${message}`);
        return {
          success: true,
          messageId: 'dev-wa-fallback-' + Date.now(),
          phone: normalizedPhone,
          maskedPhone: maskPhoneNumber(normalizedPhone),
          isFallback: true,
          gatewayNotice: errorMsg,
        };
      }

      throw new Error(`Layanan WhatsApp: ${errorMsg}`);
    }

    console.log(`📱 [WhatsApp Gateway] Pesan berhasil dikirim ke ${normalizedPhone} | ID: ${result.messageId || 'relayed'}`);
    return {
      success: true,
      messageId: result.messageId || 'relayed',
      phone: normalizedPhone,
      maskedPhone: maskPhoneNumber(normalizedPhone),
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV WA FALLBACK] Pesan untuk ${normalizedPhone}: \n${message}`);
      return {
        success: true,
        messageId: 'dev-wa-fallback-' + Date.now(),
        phone: normalizedPhone,
        maskedPhone: maskPhoneNumber(normalizedPhone),
        isFallback: true,
        gatewayNotice: error.message,
      };
    }

    if (error.name === 'AbortError') {
      console.error(`❌ [WhatsApp Gateway] Request timeout ke ${normalizedPhone}`);
      throw new Error('Layanan WhatsApp gateway mengalami timeout. Silakan coba kembali.');
    }
    console.error(`❌ [WhatsApp Gateway] Error:`, error.message);
    throw error;
  }
};

/**
 * 1. Kirim Kode Verifikasi OTP (Login / Registrasi)
 */
const buildOtpMessage = (otpCode, userName = 'Pengguna') => {
  return `*SkillSphere AI*
Halo *${userName}*,

Kode verifikasi OTP akun Anda:
*${otpCode}*

Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.`;
};

const sendWhatsAppOTP = async (phone, otpCode, userName = 'Pengguna') => {
  const message = buildOtpMessage(otpCode, userName);
  return await sendWhatsAppMessage(phone, message);
};

/**
 * 2. Kirim Nota / Bukti Pembayaran ke Siswa
 */
const sendWhatsAppPaymentReceipt = async (phone, {
  studentName = 'Pelajar',
  courseTitle = 'Kelas SkillSphere',
  orderId = '',
  amount = 0,
  paymentMethod = 'Online Transfer',
  paidAt = new Date(),
  courseUrl = '',
}) => {
  const dateStr = new Date(paidAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const message = `*SkillSphere AI - Bukti Pembayaran Kelas*
Halo *${studentName}*,

Pembayaran pendaftaran kelas Anda telah berhasil diverifikasi:
• No. Pesanan: *${orderId}*
• Kelas: *${courseTitle}*
• Total Pembayaran: *${formatRupiah(amount)}*
• Metode: *${paymentMethod.toUpperCase()}*
• Waktu: *${dateStr}*

Akses kelas Anda sekarang:
${courseUrl || (process.env.APP_URL || 'https://demo.codingsolver.my.id') + '/dashboard'}

Selamat belajar dan tingkatkan keterampilan Anda bersama SkillSphere AI!`;

  return await sendWhatsAppMessage(phone, message);
};

/**
 * 3. Kirim Pemberitahuan Penjualan Kursus ke Tutor (Hak 80%)
 */
const sendWhatsAppCourseSaleToTutor = async (phone, {
  tutorName = 'Instruktur',
  studentName = 'Siswa',
  courseTitle = 'Kelas SkillSphere',
  orderId = '',
  tutorEarning = 0,
  dashboardUrl = '',
}) => {
  const message = `*SkillSphere AI - Penjualan Kelas Baru*
Halo *${tutorName}*,

Kabar gembira! Siswa baru telah mendaftar di kelas Anda:
• Kelas: *${courseTitle}*
• Nama Siswa: *${studentName}*
• Hasil Tutor (80%): *${formatRupiah(tutorEarning)}*
• No. Transaksi: *${orderId}*

Saldo hasil telah dikreditkan ke Dompet Tutor Anda. Pantau aktivitas dan materi kelas di:
${dashboardUrl || (process.env.APP_URL || 'https://demo.codingsolver.my.id') + '/dashboard'}`;

  return await sendWhatsAppMessage(phone, message);
};

/**
 * 4. Kirim Notifikasi Materi Baru ke Siswa Terdaftar
 */
const sendWhatsAppNewMaterial = async (phone, {
  studentName = 'Pelajar',
  courseTitle = 'Kelas SkillSphere',
  sectionTitle = 'Bab Baru',
  materialTitle = 'Materi Pembelajaran',
  contentType = 'Materi',
  courseUrl = '',
}) => {
  const message = `*SkillSphere AI - Materi Baru Telah Rilis*
Halo *${studentName}*,

Instruktur baru saja menambahkan materi baru di kelas yang Anda ikuti:
• Kelas: *${courseTitle}*
• Bab: *${sectionTitle}*
• Judul: *${materialTitle}*
• Tipe: *${contentType.toUpperCase()}*

Buka materi dan lanjutkan belajar sekarang:
${courseUrl || (process.env.APP_URL || 'https://demo.codingsolver.my.id') + '/dashboard'}`;

  return await sendWhatsAppMessage(phone, message);
};

/**
 * 5. Kirim Peringatan Pendaftaran Pengajar Baru ke Admin
 */
const sendWhatsAppTutorApplicationAlert = async (phone, {
  adminName = 'Admin',
  applicantName = 'Calon Tutor',
  applicantEmail = '',
  specialization = 'Bidang Teknologi',
  reviewUrl = '',
}) => {
  const message = `*SkillSphere AI - Verifikasi Calon Pengajar Baru*
Halo *${adminName}*,

Terdapat pendaftaran pengajar baru yang membutuhkan peninjauan dokumen:
• Nama: *${applicantName}*
• Email: *${applicantEmail}*
• Spesialisasi: *${specialization}*

Tinjau portofolio, CV, dan verifikasi sertifikat di Admin Portal:
${reviewUrl || (process.env.APP_URL || 'https://demo.codingsolver.my.id') + '/admin/tutors'}`;

  return await sendWhatsAppMessage(phone, message);
};

/**
 * 6. Kirim Status Verifikasi ke Calon Pengajar
 */
const sendWhatsAppTutorApprovalStatus = async (phone, {
  applicantName = 'Calon Tutor',
  isApproved = true,
  notes = '',
  loginUrl = '',
}) => {
  const statusLabel = isApproved ? 'DISETUJUI (Aktif sebagai Tutor)' : 'DITOLAK';
  const message = `*SkillSphere AI - Status Verifikasi Pengajar*
Halo *${applicantName}*,

Pemeriksaan berkas pendaftaran Anda telah selesai diproses oleh tim Administrator:
• Status: *${statusLabel}*
${notes ? `• Catatan: ${notes}\n` : ''}
${isApproved 
  ? `Selamat bergabung! Anda kini dapat membuat kursus baru dan mengelola materi di Studio Pengajar:\n${loginUrl || (process.env.APP_URL || 'https://demo.codingsolver.my.id') + '/login'}`
  : `Terima kasih atas minat Anda. Anda dapat memperbarui portofolio dan mengajukan kembali di kemudian hari.`
}`;

  return await sendWhatsAppMessage(phone, message);
};

/**
 * 7. Kirim Peringatan Penarikan Saldo Dompet ke Admin
 */
const sendWhatsAppWithdrawalAlertToAdmin = async (phone, {
  adminName = 'Admin',
  tutorName = 'Tutor',
  amount = 0,
  bankName = '',
  accountNumber = '',
  accountHolder = '',
  adminWdUrl = '',
}) => {
  const message = `*SkillSphere AI - Permintaan Penarikan Dana (Payout)*
Halo *${adminName}*,

Pengajar mengajukan pencairan saldo dompet:
• Tutor: *${tutorName}*
• Jumlah Penarikan: *${formatRupiah(amount)}*
• Bank Tujuan: *${bankName.toUpperCase()}*
• No. Rekening: *${accountNumber}* (a.n *${accountHolder}*)

Silakan verifikasi dan proses transfer melalui Admin Payout Management:
${adminWdUrl || (process.env.APP_URL || 'https://demo.codingsolver.my.id') + '/admin'}`;

  return await sendWhatsAppMessage(phone, message);
};

/**
 * 8. Kirim Status Penarikan Dana ke Tutor
 */
const sendWhatsAppWithdrawalStatusToTutor = async (phone, {
  tutorName = 'Tutor',
  withdrawalId = '',
  amount = 0,
  status = 'completed',
  bankName = '',
  accountNumber = '',
  notes = '',
  proofUrl = '',
}) => {
  const isSuccess = status === 'completed';
  const statusText = isSuccess ? 'DANA TELAH DITRANSFER' : 'PENARIKAN DITOLAK';

  const message = `*SkillSphere AI - Status Penarikan Dana*
Halo *${tutorName}*,

Pengajuan penarikan dana dompet Anda telah diperbarui oleh tim Admin:
• ID Pengajuan: *WD-${withdrawalId}*
• Jumlah: *${formatRupiah(amount)}*
• Rekening: *${bankName.toUpperCase()} - ${accountNumber}*
• Status: *${statusText}*
${proofUrl ? `• Bukti Transfer: ${proofUrl}\n` : ''}${notes ? `• Catatan: ${notes}\n` : ''}
${isSuccess 
  ? 'Silakan periksa mutasi rekening bank Anda. Terima kasih telah berkontribusi bersama SkillSphere AI!'
  : 'Saldo telah dikembalikan ke dompet Anda. Silakan periksa kembali rincian nomor rekening Anda.'
}`;

  return await sendWhatsAppMessage(phone, message);
};

/**
 * 9. Kirim Pengingat Belajar Adaptif AI (Inactivity Nudge) ke Siswa
 */
const sendWhatsAppInactivityReminder = async (phone, {
  studentName = 'Pelajar',
  courseTitle = 'Kelas Anda',
  progressPercentage = 0,
  lastMaterialTitle = '',
  aiEncouragement = '',
  continueUrl = '',
}) => {
  const defaultNudge = `Sudah beberapa hari Anda belum melanjutkan kelas *${courseTitle}*. Luangkan 10 menit hari ini untuk melangkah lebih dekat ke target keahlian Anda!`;

  const message = `*SkillSphere AI - Pengingat Belajar Adaptif*
Halo *${studentName}*,

${aiEncouragement || defaultNudge}

• Kelas: *${courseTitle}*
• Progress Terakhir: *${Math.round(progressPercentage)}%*
${lastMaterialTitle ? `• Modul Terakhir: *${lastMaterialTitle}*\n` : ''}
Lanjutkan belajar sekarang:
${continueUrl || (process.env.APP_URL || 'https://demo.codingsolver.my.id') + '/dashboard'}`;

  return await sendWhatsAppMessage(phone, message);
};

module.exports = {
  normalizePhoneNumber,
  maskPhoneNumber,
  formatRupiah,
  sendWhatsAppMessage,
  buildOtpMessage,
  sendWhatsAppOTP,
  sendWhatsAppPaymentReceipt,
  sendWhatsAppCourseSaleToTutor,
  sendWhatsAppNewMaterial,
  sendWhatsAppTutorApplicationAlert,
  sendWhatsAppTutorApprovalStatus,
  sendWhatsAppWithdrawalAlertToAdmin,
  sendWhatsAppWithdrawalStatusToTutor,
  sendWhatsAppInactivityReminder,
};
