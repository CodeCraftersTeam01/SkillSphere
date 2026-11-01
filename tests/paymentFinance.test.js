const assert = require('assert');
const http = require('http');
const express = require('express');
const {
  sequelize,
  User,
  Course,
  Category,
  Transaction,
  TutorWallet,
  WalletTransaction,
  WithdrawalRequest,
  Enrollment,
} = require('../models');
const midtransService = require('../services/midtransService');
const paymentController = require('../controllers/paymentController');

async function runPaymentFinanceTests() {
  console.log('🧪 Starting Midtrans Payment Gateway, Split 20/80 & Wallet Test Suite...\n');

  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });

    // 1. Setup Data Uji (Tutor, Student, Category, Course)
    const timestamp = Date.now();
    const tutor = await User.create({
      name: `Tutor Finance ${timestamp}`,
      email: `tutor_finance_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'tutor',
      is_verified: true,
    });

    const student = await User.create({
      name: `Student Finance ${timestamp}`,
      email: `student_finance_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });

    let category = await Category.findOne();
    if (!category) {
      category = await Category.create({
        name: `Web Development ${timestamp}`,
        slug: `web-dev-${timestamp}`,
      });
    }

    const coursePrice = 250000;
    const course = await Course.create({
      tutor_id: tutor.id,
      category_id: category.id,
      title: `Fullstack Next.js Masterclass ${timestamp}`,
      slug: `fullstack-nextjs-masterclass-${timestamp}`,
      description: 'Kursus fullstack modern.',
      price: coursePrice,
      status: 'published',
    });

    // 2. Test createSnapToken (20% Platform Fee, 80% Tutor Earning)
    const mockReqSnap = {
      user: { id: student.id },
      body: { course_id: course.id },
    };

    let snapResData = null;
    let snapStatusCode = null;
    const mockResSnap = {
      status(code) {
        snapStatusCode = code;
        return this;
      },
      json(data) {
        snapResData = data;
        return this;
      },
    };

    await paymentController.createSnapToken(mockReqSnap, mockResSnap);
    assert.strictEqual(snapStatusCode, 201, 'Snap token request must return 201 Created');
    assert.strictEqual(snapResData.success, true);
    assert(snapResData.data.token, 'Must return Snap token');
    assert.strictEqual(snapResData.data.amount, 250000);
    assert.strictEqual(snapResData.data.platform_fee, 50000, '20% platform fee should be Rp 50.000');
    assert.strictEqual(snapResData.data.tutor_earning, 200000, '80% tutor earning should be Rp 200.000');
    console.log('  ✔ createSnapToken: Created transaction with 20% platform fee and 80% tutor share.');

    const orderId = snapResData.data.transaction_code;

    // 3. Test Invalid Signature Webhook Rejection
    let notifRes = null;
    let notifCode = null;
    const mockResNotif = {
      status(code) {
        notifCode = code;
        return this;
      },
      json(data) {
        notifRes = data;
        return this;
      },
    };

    await paymentController.handleNotification(
      {
        body: {
          order_id: orderId,
          status_code: '200',
          gross_amount: '250000',
          signature_key: 'invalid_fraudulent_signature',
          transaction_status: 'settlement',
        },
      },
      mockResNotif
    );
    assert.strictEqual(notifCode, 400, 'Invalid signature must be rejected with 400');
    console.log('  ✔ Security: Webhook rejected invalid signature key (400 Bad Request).');

    // 4. Test Valid Webhook Notification & 20/80 Auto Split
    const validSignature = midtransService.generateMockSignature(orderId, '200', '250000');
    await paymentController.handleNotification(
      {
        body: {
          order_id: orderId,
          status_code: '200',
          gross_amount: '250000',
          signature_key: validSignature,
          transaction_status: 'settlement',
          payment_type: 'qris',
        },
      },
      mockResNotif
    );
    assert.strictEqual(notifCode, 200);
    assert.strictEqual(notifRes.success, true);

    // Verifikasi database: Transaksi settlement
    const updatedTrx = await Transaction.findOne({ where: { transaction_code: orderId } });
    assert.strictEqual(updatedTrx.payment_status, 'settlement');
    assert.strictEqual(updatedTrx.payment_method, 'qris');
    assert(updatedTrx.paid_at, 'paid_at must be populated');

    // Verifikasi database: Saldo TutorWallet bertambah 80% (Rp 200.000)
    const tutorWallet = await TutorWallet.findOne({ where: { tutor_id: tutor.id } });
    assert.strictEqual(Number(tutorWallet.balance), 200000, 'Tutor wallet balance must be Rp 200.000');

    // Verifikasi database: Log mutasi kredit tercatat di wallet_transactions
    const walletMutations = await WalletTransaction.findAll({ where: { wallet_id: tutorWallet.id } });
    assert.strictEqual(walletMutations.length, 1);
    assert.strictEqual(walletMutations[0].transaction_type, 'credit');
    assert.strictEqual(Number(walletMutations[0].amount), 200000);
    assert.strictEqual(walletMutations[0].reference_type, 'sale');

    // Verifikasi database: Enrollment siswa aktif otomatis
    const enrollment = await Enrollment.findOne({ where: { user_id: student.id, course_id: course.id } });
    assert(enrollment, 'Enrollment record must exist');
    assert.strictEqual(enrollment.status, 'active');
    console.log('  ✔ Webhook Settlement: Auto split 80% to TutorWallet, created mutation log, and activated Enrollment.');

    // 5. Test Webhook Idempotency (kirim ulang tidak menduplikasi kredit)
    await paymentController.handleNotification(
      {
        body: {
          order_id: orderId,
          status_code: '200',
          gross_amount: '250000',
          signature_key: validSignature,
          transaction_status: 'settlement',
        },
      },
      mockResNotif
    );
    const tutorWalletAfterIdempotent = await TutorWallet.findOne({ where: { tutor_id: tutor.id } });
    assert.strictEqual(Number(tutorWalletAfterIdempotent.balance), 200000, 'Idempotent webhook must not duplicate balance');
    console.log('  ✔ Idempotency: Duplicate settlement notification handled safely without double crediting.');

    // 6. Test Tutor Withdrawal (Min Rp 100.000)
    let wdCode = null;
    let wdRes = null;
    const mockResWd = {
      status(code) {
        wdCode = code;
        return this;
      },
      json(data) {
        wdRes = data;
        return this;
      },
    };

    // 6a. Gagal jika di bawah batas minimum Rp 100.000
    await paymentController.requestWithdrawal(
      {
        user: { id: tutor.id },
        body: {
          amount: 50000,
          bank_name: 'BCA',
          account_number: '1234567890',
          account_holder_name: 'Tegar Mahardika',
        },
      },
      mockResWd
    );
    assert.strictEqual(wdCode, 400);
    assert(wdRes.message.includes('100.000'));
    console.log('  ✔ Withdrawal Policy: Blocked withdrawal request below minimum Rp 100.000.');

    // 6b. Sukses jika saldo mencukupi (Tarik Rp 150.000 dari saldo Rp 200.000)
    await paymentController.requestWithdrawal(
      {
        user: { id: tutor.id },
        body: {
          amount: 150000,
          bank_name: 'BCA',
          account_number: '1234567890',
          account_holder_name: 'Tegar Mahardika',
        },
      },
      mockResWd
    );
    assert.strictEqual(wdCode, 201);
    assert.strictEqual(wdRes.data.remaining_balance, 50000);

    const tutorWalletAfterWd = await TutorWallet.findOne({ where: { tutor_id: tutor.id } });
    assert.strictEqual(Number(tutorWalletAfterWd.balance), 50000);

    const debits = await WalletTransaction.findAll({
      where: { wallet_id: tutorWallet.id, transaction_type: 'debit' },
    });
    assert.strictEqual(debits.length, 1);
    assert.strictEqual(Number(debits[0].amount), 150000);
    console.log('  ✔ Withdrawal Success: Debited Rp 150.000, created WithdrawalRequest, and remaining balance Rp 50.000.');

    // 7. Test getTutorWallet API
    let walletGetCode = null;
    let walletGetData = null;
    await paymentController.getTutorWallet(
      { user: { id: tutor.id } },
      {
        status(code) {
          walletGetCode = code;
          return this;
        },
        json(data) {
          walletGetData = data;
          return this;
        },
      }
    );
    assert.strictEqual(walletGetCode, 200);
    assert.strictEqual(walletGetData.data.wallet.balance, 50000);
    assert.strictEqual(walletGetData.data.transactions.length, 2); // 1 credit, 1 debit
    assert.strictEqual(walletGetData.data.withdrawals.length, 1);
    console.log('  ✔ getTutorWallet: Returned wallet balance, 2 mutation records, and 1 withdrawal request.');

    // 8. Test getStudentTransactions API
    let studentTrxCode = null;
    let studentTrxData = null;
    await paymentController.getStudentTransactions(
      { user: { id: student.id } },
      {
        status(code) {
          studentTrxCode = code;
          return this;
        },
        json(data) {
          studentTrxData = data;
          return this;
        },
      }
    );
    assert.strictEqual(studentTrxCode, 200);
    assert.strictEqual(studentTrxData.data.length, 1);
    assert.strictEqual(studentTrxData.data[0].transaction_code, orderId);
    console.log('  ✔ getStudentTransactions: Retrieved student invoice and transaction history.');

    console.log('\n======================================================');
    console.log('🎉 ALL MIDTRANS PAYMENT, SPLIT 20/80 & WALLET TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Payment Finance Test Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runPaymentFinanceTests().then(() => process.exit(0));
}

module.exports = runPaymentFinanceTests;
