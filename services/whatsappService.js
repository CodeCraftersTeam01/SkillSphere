require('dotenv').config();

/**
 * WhatsApp Gateway Service for SkillSphere AI
 * Handles OTP delivery fallback when SMTP/email is unavailable.
 */

/**
 * Normalizes Indonesian and international phone numbers into the standard WhatsApp format (e.g. 6281234567890)
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

  // Validate format: must be all digits, between 10 and 16 digits long, typically starting with 628
  if (!/^\d{10,16}$/.test(cleaned)) {
    throw new Error('Format nomor WhatsApp tidak valid. Pastikan nomor minimal 10 digit angka.');
  }

  return cleaned;
};

/**
 * Masks phone number for secure client-side display (e.g. 62856****7829)
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
 * Compose clean WhatsApp OTP Message (Anti-Slop compliant, no em-dash)
 * @param {string} otpCode
 * @param {string} userName
 * @returns {string}
 */
const buildOtpMessage = (otpCode, userName = 'Pengguna') => {
  return `*SkillSphere AI*
Halo *${userName}*,

Kode verifikasi OTP akun Anda:
*${otpCode}*

Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.`;
};

/**
 * Send WhatsApp OTP via External Gateway API
 * @param {string} phone 
 * @param {string} otpCode 
 * @param {string} userName 
 * @returns {Promise<{success: boolean, messageId?: string, phone: string}>}
 */
const sendWhatsAppOTP = async (phone, otpCode, userName = 'Pengguna') => {
  const gatewayUrl = process.env.WA_GATEWAY_URL || 'https://ubuntu.leopard-gila.ts.net/api/whatsapp/send';
  const apiKey = process.env.WA_API_KEY;

  if (!apiKey) {
    console.error('❌ [WhatsApp Gateway] WA_API_KEY belum dikonfigurasi di environment (.env).');
    throw new Error('Konfigurasi API WhatsApp belum lengkap di server.');
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const message = buildOtpMessage(otpCode, userName);

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

      // In test or development environment, provide resilient fallback with logged OTP
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
        console.log(`🔑 [DEV WA OTP FALLBACK] Kode OTP untuk ${normalizedPhone}: ${otpCode} (Gateway info: ${errorMsg})`);
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

    console.log(`📱 [WhatsApp Gateway] OTP berhasil dikirim ke ${normalizedPhone} | ID: ${result.messageId || 'relayed'}`);
    return {
      success: true,
      messageId: result.messageId || 'relayed',
      phone: normalizedPhone,
      maskedPhone: maskPhoneNumber(normalizedPhone),
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      console.log(`🔑 [DEV WA OTP FALLBACK] Kode OTP untuk ${normalizedPhone}: ${otpCode} (Gateway error: ${error.message})`);
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

module.exports = {
  normalizePhoneNumber,
  maskPhoneNumber,
  buildOtpMessage,
  sendWhatsAppOTP,
};
