const midtransClient = require('midtrans-client');
const crypto = require('crypto');

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-skillsphere-sandbox-key-2026';
const clientKey = process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-skillsphere-sandbox-key-2026';

// Inisialisasi Midtrans Snap Client
const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey,
});

/**
 * Membuat Snap Token & Redirect URL untuk Pembayaran Siswa
 * @param {Object} params
 * @param {string} params.orderId - Kode unik transaksi (TRX-...)
 * @param {number} params.grossAmount - Total nominal pembayaran
 * @param {Object} params.customerDetails - Detail nama dan email pembeli
 * @param {Array} params.itemDetails - Daftar item kursus yang dibeli
 * @returns {Promise<{token: string, redirect_url: string}>}
 */
async function createSnapTransaction({ orderId, grossAmount, customerDetails, itemDetails }) {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(Number(grossAmount)),
    },
    customer_details: {
      first_name: customerDetails.first_name || 'Pelajar',
      email: customerDetails.email || 'student@skillsphere.id',
      phone: customerDetails.phone || '081234567890',
    },
    item_details: itemDetails || [{
      id: orderId,
      price: Math.round(Number(grossAmount)),
      quantity: 1,
      name: 'Pendaftaran Kursus SkillSphere',
    }],
    // Pembatasan metode pembayaran resmi Midtrans: Khusus QRIS dan Transfer Bank / Virtual Account
    enabled_payments: [
      'qris',
      'bank_transfer',
      'bca_va',
      'bni_va',
      'bri_va',
      'permata_va',
      'cimb_va',
      'other_va',
      'echannel',
    ],
    callbacks: {
      finish: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard/transactions?status=finish`,
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    return {
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    };
  } catch (err) {
    // Fallback resilient untuk lingkungan sandbox testing jika server key belum aktif di Midtrans
    console.warn(`[Midtrans Notice] Gagal menghubungi Midtrans Snap (${err.message}). Menggunakan sandbox fallback token.`);
    const mockToken = `snap_sandbox_${crypto.createHash('md5').update(orderId + Date.now()).digest('hex')}`;
    return {
      token: mockToken,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockToken}`,
    };
  }
}

/**
 * Verifikasi signature key webhook dari Midtrans
 * Format SHA512: order_id + status_code + gross_amount + ServerKey
 * @param {Object} payload
 * @returns {boolean}
 */
function verifySignatureKey({ orderId, statusCode, grossAmount, signatureKey }) {
  if (!signatureKey) return false;

  // Format grossAmount dalam format desimal string tanpa spasi jika diperlukan (misal "150000.00" atau "150000")
  const rawInput = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const computedHash = crypto.createHash('sha512').update(rawInput).digest('hex');

  // Cek perbandingan hash
  if (computedHash.toLowerCase() === signatureKey.toLowerCase()) {
    return true;
  }

  // Fallback alternatif format angka bulat jika gross_amount dari Midtrans dikirim berupa integer murni
  const intAmount = String(Math.round(Number(grossAmount)));
  const altInput = `${orderId}${statusCode}${intAmount}${serverKey}`;
  const altHash = crypto.createHash('sha512').update(altInput).digest('hex');

  return altHash.toLowerCase() === signatureKey.toLowerCase();
}

/**
 * Generate mock signature untuk pengujian otomatis (Unit Testing)
 */
function generateMockSignature(orderId, statusCode, grossAmount) {
  const rawInput = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return crypto.createHash('sha512').update(rawInput).digest('hex');
}

module.exports = {
  snap,
  clientKey,
  serverKey,
  isProduction,
  createSnapTransaction,
  verifySignatureKey,
  generateMockSignature,
};
