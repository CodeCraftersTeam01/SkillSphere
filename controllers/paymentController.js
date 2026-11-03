const { Op } = require('sequelize');
const {
  Transaction,
  TutorWallet,
  WalletTransaction,
  WithdrawalRequest,
  Course,
  Enrollment,
  User,
} = require('../models');
const midtransService = require('../services/midtransService');

const PLATFORM_FEE_PERCENTAGE = Number(process.env.PLATFORM_FEE_PERCENTAGE || 20);
const TUTOR_SHARE_PERCENTAGE = Number(process.env.TUTOR_SHARE_PERCENTAGE || 80);
const WITHDRAWAL_MIN_AMOUNT = Number(process.env.WITHDRAWAL_MIN_AMOUNT || 100000);

/**
 * 1. Membuat Midtrans Snap Token untuk Checkout Kursus
 * POST /api/payments/snap-token
 */
async function createSnapToken(req, res) {
  try {
    const userId = req.user.id;
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter course_id wajib disertakan.',
      });
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    // Cek apakah siswa sudah terdaftar aktif
    const existingEnrollment = await Enrollment.findOne({
      where: { user_id: userId, course_id: course.id, status: 'active' },
    });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah terdaftar aktif di kursus ini.',
      });
    }

    const price = Number(course.price || 0);
    if (price <= 0) {
      // Kursus gratis: langsung aktivasi enrollment
      await Enrollment.findOrCreate({
        where: { user_id: userId, course_id: course.id },
        defaults: { status: 'active', progress_percentage: 0 },
      });
      return res.status(200).json({
        success: true,
        message: 'Pendaftaran kursus gratis berhasil.',
        data: { is_free: true, course_id: course.id },
      });
    }

    // Hitung bagi hasil 20% Platform dan 80% Tutor Earning
    const platformFee = Math.round((price * PLATFORM_FEE_PERCENTAGE) / 100);
    const tutorEarning = price - platformFee;

    // Cek apakah siswa sudah memiliki transaksi pending yang masih aktif untuk kursus ini (Anti-Duplikasi / Idempotency)
    let transaction = await Transaction.findOne({
      where: {
        user_id: userId,
        course_id: course.id,
        payment_status: 'pending',
      },
      order: [['created_at', 'DESC']],
    });

    // Jika ada duplikasi transaksi pending lama untuk kursus yang sama, tandai expired agar tidak berulang
    if (transaction) {
      await Transaction.update(
        { payment_status: 'expired' },
        {
          where: {
            user_id: userId,
            course_id: course.id,
            payment_status: 'pending',
            id: { [Op.ne]: transaction.id },
          },
        }
      );
    }

    let snapResult = null;
    const user = await User.findByPk(userId);

    // Jika transaksi pending sudah memiliki Snap token yang valid, gunakan kembali (jangan buat order baru)
    if (transaction && transaction.payment_response && transaction.payment_response.token) {
      snapResult = transaction.payment_response;
    } else {
      // Buat kode transaksi unik baru jika belum memiliki token untuk menghindari "order_id sudah digunakan" di Midtrans
      const transactionCode = `TRX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (!transaction) {
        transaction = await Transaction.create({
          transaction_code: transactionCode,
          user_id: userId,
          course_id: course.id,
          amount: price,
          platform_fee: platformFee,
          tutor_earning: tutorEarning,
          payment_method: 'midtrans_snap',
          payment_status: 'pending',
        });
      } else {
        await transaction.update({
          transaction_code: transactionCode,
        });
      }

      snapResult = await midtransService.createSnapTransaction({
        orderId: transactionCode,
        grossAmount: price,
        customerDetails: {
          first_name: (user && (user.name || user.username)) || 'Pelajar',
          email: (user && user.email) || 'student@skillsphere.id',
        },
        itemDetails: [{
          id: String(course.id),
          price: price,
          quantity: 1,
          name: course.title.substring(0, 50),
        }],
      });

      await transaction.update({
        payment_response: snapResult,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Token pembayaran Midtrans berhasil dibuat.',
      data: {
        token: snapResult.token,
        redirect_url: snapResult.redirect_url,
        transaction_code: transaction.transaction_code,
        amount: price,
        platform_fee: platformFee,
        tutor_earning: tutorEarning,
      },
    });
  } catch (err) {
    console.error('Error in createSnapToken:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat sesi pembayaran Midtrans.',
      error: err.message,
    });
  }
}

/**
 * 2. Webhook Notifikasi Status Pembayaran dari Midtrans
 * POST /api/payments/notification
 */
async function handleNotification(req, res) {
  try {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
      fraud_status,
    } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Format payload notifikasi tidak valid (order_id kosong).',
      });
    }

    // Verifikasi signature key keamanan dari Midtrans
    const isValidSignature = midtransService.verifySignatureKey({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      signatureKey: signature_key,
    });

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Signature key notifikasi Midtrans tidak valid.',
      });
    }

    const transaction = await Transaction.findOne({
      where: { transaction_code: order_id },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: `Transaksi dengan kode ${order_id} tidak ditemukan.`,
      });
    }

    // Evaluasi status pembayaran
    const isSettlement = transaction_status === 'settlement' ||
      (transaction_status === 'capture' && (!fraud_status || fraud_status === 'accept'));

    if (isSettlement) {
      // Idempotensi: jika sudah berstatus settlement, respons sukses tanpa duplikasi mutasi
      if (transaction.payment_status === 'settlement') {
        return res.status(200).json({
          success: true,
          message: 'Transaksi sudah berstatus settlement.',
        });
      }

      // 1. Update status transaksi
      transaction.payment_status = 'settlement';
      transaction.payment_method = payment_type || transaction.payment_method || 'midtrans';
      transaction.paid_at = new Date();
      transaction.payment_response = req.body;
      await transaction.save();

      // 2. Bagi hasil: kreditkan 80% hak tutor ke Virtual TutorWallet
      const course = await Course.findByPk(transaction.course_id);
      if (course) {
        const [wallet] = await TutorWallet.findOrCreate({
          where: { tutor_id: course.tutor_id },
          defaults: { balance: 0.00, pending_balance: 0.00 },
        });

        const earning = Number(transaction.tutor_earning);
        wallet.balance = Number(wallet.balance) + earning;
        await wallet.save();

        // Catat mutasi saldo ke tabel wallet_transactions
        await WalletTransaction.create({
          wallet_id: wallet.id,
          transaction_type: 'credit',
          amount: earning,
          reference_id: transaction.transaction_code,
          reference_type: 'sale',
          description: `Bagi hasil 80% penjualan kursus: ${course.title}`,
        });
      }

      // 3. Aktivasi enrollment siswa
      await Enrollment.findOrCreate({
        where: {
          user_id: transaction.user_id,
          course_id: transaction.course_id,
        },
        defaults: {
          status: 'active',
          progress_percentage: 0.0,
          enrolled_at: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Pembayaran berhasil diselesaikan, bagi hasil dicatat, dan kelas diaktifkan.',
      });
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      transaction.payment_status = transaction_status === 'expire' ? 'expired' : 'failed';
      transaction.payment_response = req.body;
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: `Status pembayaran diperbarui menjadi ${transaction.payment_status}.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notifikasi status pending diterima.',
    });
  } catch (err) {
    console.error('Error in handleNotification:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses notifikasi webhook Midtrans.',
      error: err.message,
    });
  }
}

/**
 * 3. Mengambil Data Dompet Tutor & Riwayat Mutasi
 * GET /api/tutor/wallet
 */
async function getTutorWallet(req, res) {
  try {
    const tutorId = req.user.id;

    const [wallet] = await TutorWallet.findOrCreate({
      where: { tutor_id: tutorId },
      defaults: { balance: 0.00, pending_balance: 0.00 },
    });

    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const withdrawals = await WithdrawalRequest.findAll({
      where: { tutor_id: tutorId },
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    const totalSalesCredit = transactions
      .filter(t => t.transaction_type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalWithdrawn = withdrawals
      .filter(w => w.status === 'completed' || w.status === 'approved')
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    return res.status(200).json({
      success: true,
      message: 'Data dompet tutor berhasil dimuat.',
      data: {
        wallet: {
          id: wallet.id,
          balance: Number(wallet.balance),
          pending_balance: Number(wallet.pending_balance),
          holding_balance: Number(wallet.pending_balance),
          total_earnings: totalSalesCredit,
          holding_period_days: 7,
          min_withdrawal: WITHDRAWAL_MIN_AMOUNT,
        },
        transactions,
        withdrawals,
        // Flat aliases for direct access in various view templates
        balance: Number(wallet.balance),
        holding_balance: Number(wallet.pending_balance),
        pending_balance: Number(wallet.pending_balance),
        withdrawn_total: totalWithdrawn,
        mutations: transactions,
      },
    });
  } catch (err) {
    console.error('Error in getTutorWallet:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat data dompet tutor.',
      error: err.message,
    });
  }
}

/**
 * 4. Pengajuan Penarikan Dana (Withdrawal) oleh Tutor
 * POST /api/tutor/withdraw
 */
async function requestWithdrawal(req, res) {
  try {
    const tutorId = req.user.id;
    const { amount, bank_name, account_number, account_holder_name, account_name } = req.body;
    const finalAccountHolder = (account_holder_name || account_name || '').trim();

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < WITHDRAWAL_MIN_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Nominal penarikan minimum adalah Rp ${WITHDRAWAL_MIN_AMOUNT.toLocaleString('id-ID')}.`,
      });
    }

    if (!bank_name || !account_number || !finalAccountHolder) {
      return res.status(400).json({
        success: false,
        message: 'Nama bank, nomor rekening, dan nama pemilik rekening wajib diisi.',
      });
    }

    const wallet = await TutorWallet.findOne({ where: { tutor_id: tutorId } });
    if (!wallet || Number(wallet.balance) < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: 'Saldo yang tersedia tidak mencukupi untuk melakukan penarikan.',
      });
    }

    // Debet saldo dari dompet
    wallet.balance = Number(wallet.balance) - withdrawAmount;
    await wallet.save();

    // Buat permohonan penarikan dana
    const withdrawal = await WithdrawalRequest.create({
      wallet_id: wallet.id,
      tutor_id: tutorId,
      amount: withdrawAmount,
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      account_holder_name: finalAccountHolder,
      status: 'pending',
    });

    // Catat mutasi debet pada log transaksi dompet
    await WalletTransaction.create({
      wallet_id: wallet.id,
      transaction_type: 'debit',
      amount: withdrawAmount,
      reference_id: `WD-${withdrawal.id}`,
      reference_type: 'withdrawal',
      description: `Pengajuan penarikan dana ke rekening ${bank_name} ${account_number} a.n ${account_holder_name}`,
    });

    return res.status(201).json({
      success: true,
      message: 'Pengajuan penarikan dana berhasil diajukan dan sedang diproses tim admin.',
      data: {
        withdrawal,
        remaining_balance: Number(wallet.balance),
      },
    });
  } catch (err) {
    console.error('Error in requestWithdrawal:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses pengajuan penarikan dana.',
      error: err.message,
    });
  }
}

/**
 * 5. Riwayat Transaksi Siswa
 * GET /api/payments/transactions
 */
async function getStudentTransactions(req, res) {
  try {
    const userId = req.user.id;

    const transactions = await Transaction.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'thumbnail_url', 'price'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Sinkronisasi status real-time langsung dari Midtrans API
    for (const trx of transactions) {
      if (trx.payment_status === 'settlement') continue;

      try {
        const midtransRes = await midtransService.checkTransactionStatus(trx.transaction_code);
        if (midtransRes && midtransRes.transaction_status) {
          const mStatus = (midtransRes.transaction_status || '').toLowerCase();
          const fraudStatus = (midtransRes.fraud_status || '').toLowerCase();
          const paymentType = midtransRes.payment_type || trx.payment_method;

          if (mStatus === 'settlement' || (mStatus === 'capture' && (!fraudStatus || fraudStatus === 'accept'))) {
            trx.payment_status = 'settlement';
            trx.payment_method = paymentType;
            trx.paid_at = new Date();
            trx.payment_response = midtransRes;
            await trx.save();

            // 1. Aktifkan enrollment kursus siswa
            await Enrollment.findOrCreate({
              where: { user_id: trx.user_id, course_id: trx.course_id },
              defaults: { status: 'active', progress_percentage: 0 },
            });

            // 2. Bagi hasil 80% ke dompet tutor
            const course = await Course.findByPk(trx.course_id);
            if (course && course.tutor_id) {
              const [wallet] = await TutorWallet.findOrCreate({
                where: { user_id: course.tutor_id },
                defaults: { balance: 0, holding_balance: 0, total_earned: 0 },
              });
              await wallet.increment({
                balance: trx.tutor_earning,
                total_earned: trx.tutor_earning,
              });
              await WalletTransaction.create({
                wallet_id: wallet.id,
                transaction_type: 'credit',
                amount: trx.tutor_earning,
                description: `Bagi hasil kursus (80%): ${course.title}`,
                reference_id: trx.transaction_code,
              });
            }
          } else if (['cancel', 'deny', 'cancelled'].includes(mStatus)) {
            trx.payment_status = 'failed';
            trx.payment_method = paymentType;
            await trx.save();
          } else if (['expire', 'expired'].includes(mStatus)) {
            trx.payment_status = 'expired';
            trx.payment_method = paymentType;
            await trx.save();
          } else if (mStatus === 'pending') {
            trx.payment_status = 'pending';
            if (paymentType && trx.payment_method !== paymentType) {
              trx.payment_method = paymentType;
              await trx.save();
            }
          }
        }
      } catch (errSync) {
        // Abaikan jika order tidak ada di Midtrans
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Riwayat transaksi siswa berhasil dimuat.',
      data: transactions,
    });
  } catch (err) {
    console.error('Error in getStudentTransactions:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat riwayat transaksi siswa.',
      error: err.message,
    });
  }
}

/**
 * 6. Cek Status Transaksi Spesifik
 * GET /api/payments/status/:code
 */
async function getTransactionStatus(req, res) {
  try {
    const { code } = req.params;
    const transaction = await Transaction.findOne({
      where: { transaction_code: code },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'price'],
        },
      ],
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan.',
      });
    }

    // Sinkronisasi status jika belum settlement
    if (transaction.payment_status !== 'settlement') {
      try {
        const midtransRes = await midtransService.checkTransactionStatus(transaction.transaction_code);
        if (midtransRes && midtransRes.transaction_status) {
          const mStatus = (midtransRes.transaction_status || '').toLowerCase();
          const fraudStatus = (midtransRes.fraud_status || '').toLowerCase();
          const paymentType = midtransRes.payment_type || transaction.payment_method;

          if (mStatus === 'settlement' || (mStatus === 'capture' && (!fraudStatus || fraudStatus === 'accept'))) {
            transaction.payment_status = 'settlement';
            transaction.payment_method = paymentType;
            transaction.paid_at = new Date();
            transaction.payment_response = midtransRes;
            await transaction.save();

            await Enrollment.findOrCreate({
              where: { user_id: transaction.user_id, course_id: transaction.course_id },
              defaults: { status: 'active', progress_percentage: 0 },
            });
          } else if (['cancel', 'deny', 'cancelled'].includes(mStatus)) {
            transaction.payment_status = 'failed';
            transaction.payment_method = paymentType;
            await transaction.save();
          } else if (['expire', 'expired'].includes(mStatus)) {
            transaction.payment_status = 'expired';
            transaction.payment_method = paymentType;
            await transaction.save();
          }
        }
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    console.error('Error in getTransactionStatus:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memeriksa status transaksi.',
      error: err.message,
    });
  }
}

module.exports = {
  createSnapToken,
  handleNotification,
  getTutorWallet,
  requestWithdrawal,
  getStudentTransactions,
  getTransactionStatus,
};
