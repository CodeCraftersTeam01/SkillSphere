require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter;

const createTransporter = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isGmail = (process.env.SMTP_HOST || '').includes('gmail');
    
    if (isGmail) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\s+/g, ''), // remove any spaces in app password
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
      },
    });
  }

  // Fallback / Development mode with Ethereal / Console logger
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

/**
 * Send OTP Verification Email
 * @param {string} toEmail 
 * @param {string} otpCode 
 * @param {string} userName 
 */
const sendOTPEmail = async (toEmail, otpCode, userName = 'Pengguna') => {
  try {
    if (!transporter) {
      transporter = await createTransporter();
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || `"SkillSphere AI" <${process.env.SMTP_USER || 'no-reply@skillsphere.id'}>`,
      to: toEmail,
      subject: `Kode Verifikasi Pendaftaran SkillSphere AI: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FBF9F5; margin: 0; padding: 24px; color: #1F1E1D; }
            .email-container { max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E8E2D9; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(45,41,38,0.06); }
            .logo-header { text-align: center; margin-bottom: 24px; }
            .brand-title { font-family: 'Newsreader', Georgia, serif; font-size: 24px; font-weight: 600; color: #1F1E1D; margin: 8px 0 0; }
            .heading { font-family: 'Newsreader', Georgia, serif; font-size: 22px; font-weight: 500; color: #1F1E1D; margin-bottom: 12px; }
            .text { font-size: 14px; line-height: 1.6; color: #6B665F; margin-bottom: 24px; }
            .otp-box { background: #F3EFEA; border: 1px dashed #D5CDC0; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
            .otp-code { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #000000; }
            .otp-expiry { font-size: 12px; color: #9C968D; margin-top: 6px; }
            .footer { font-size: 12px; color: #9C968D; text-align: center; margin-top: 32px; border-top: 1px solid #E8E2D9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="logo-header">
              <div style="font-size: 28px;">✦</div>
              <div class="brand-title">SkillSphere AI</div>
            </div>
            
            <div class="heading">Verifikasi Email Pendaftaran</div>
            <div class="text">
              Halo <strong>${userName}</strong>,<br>
              Terima kasih telah bergabung di <strong>SkillSphere AI</strong>. Silakan masukkan 6 digit kode OTP berikut untuk menyelesaikan verifikasi akun Anda:
            </div>

            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
              <div class="otp-expiry">Berlaku selama 10 menit</div>
            </div>

            <div class="text" style="font-size: 13px;">
              Jika Anda tidak merasa melakukan pendaftaran ini, abaikan email ini. Jangan membagikan kode OTP ini kepada siapapun demi keamanan akun Anda.
            </div>

            <div class="footer">
              © 2026 SkillSphere AI — Platform Pembelajaran Online & Multi-Vendor
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [SMTP Mailer] OTP Email sent successfully to ${toEmail} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [SMTP Mailer Error]:', error);
    console.log(`🔑 [DEV OTP FALLBACK] Kode OTP untuk ${toEmail}: ${otpCode}`);
    return { success: true, isFallback: true };
  }
};

module.exports = {
  sendOTPEmail,
};
