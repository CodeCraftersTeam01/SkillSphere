const assert = require('assert');
const {
  normalizePhoneNumber,
  maskPhoneNumber,
  formatRupiah,
  sendWhatsAppMessage,
  sendWhatsAppPaymentReceipt,
  sendWhatsAppCourseSaleToTutor,
  sendWhatsAppNewMaterial,
  sendWhatsAppTutorApplicationAlert,
  sendWhatsAppTutorApprovalStatus,
  sendWhatsAppWithdrawalAlertToAdmin,
  sendWhatsAppWithdrawalStatusToTutor,
  sendWhatsAppInactivityReminder,
} = require('../services/whatsappService');
const {
  generateStudyEncouragement,
  checkAndRemindInactiveStudents,
} = require('../services/inactivityReminderService');

process.env.NODE_ENV = 'test';

async function runWhatsAppNotificationsTestSuite() {
  console.log('\n🧪 Memulai WhatsApp Enterprise Notification Test Suite...\n');

  // Test 1: Helper currency formatter & phone normalizer
  console.log('🔹 Test 1: Verifikasi helper formatRupiah dan normalisasi nomor WhatsApp');
  assert.strictEqual(formatRupiah(150000).replace(/\s/g, ' '), 'Rp 150.000'.replace(/\s/g, ' '));
  assert.strictEqual(formatRupiah(0).replace(/\s/g, ' '), 'Rp 0'.replace(/\s/g, ' '));
  assert.strictEqual(normalizePhoneNumber('085648077829'), '6285648077829');
  assert.strictEqual(normalizePhoneNumber('+62 856-4807-7829'), '6285648077829');
  assert.strictEqual(maskPhoneNumber('085648077829'), '+6285****829');
  console.log('✅ Test 1 Passed: Helper formatting berfungsi dengan presisi.');

  // Test 2: Nota Pembayaran Siswa
  console.log('🔹 Test 2: Verifikasi pengiriman bukti pembayaran (nota) ke Siswa');
  const receiptResult = await sendWhatsAppPaymentReceipt('085648077829', {
    studentName: 'Budi Santoso',
    courseTitle: 'Mastering Enterprise Backend Architecture',
    orderId: 'TRX-1794747202',
    amount: 500000,
    paymentMethod: 'gopay',
    paidAt: new Date(),
    courseUrl: 'https://demo.codingsolver.my.id/dashboard/learning?courseId=10',
  });
  assert.strictEqual(receiptResult.success, true);
  assert.strictEqual(receiptResult.simulated, true);
  console.log('✅ Test 2 Passed: Notifikasi nota pembayaran ke Siswa terkirim.');

  // Test 3: Notifikasi Penjualan Kursus ke Tutor (Hak 80%)
  console.log('🔹 Test 3: Verifikasi notifikasi bagi hasil penjualan kelas ke Tutor');
  const saleResult = await sendWhatsAppCourseSaleToTutor('085648077829', {
    tutorName: 'Arjuna Lanang',
    studentName: 'Budi Santoso',
    courseTitle: 'Mastering Enterprise Backend Architecture',
    orderId: 'TRX-1794747202',
    tutorEarning: 400000,
  });
  assert.strictEqual(saleResult.success, true);
  assert.strictEqual(saleResult.simulated, true);
  console.log('✅ Test 3 Passed: Notifikasi penjualan dan bagi hasil 80% ke Tutor terkirim.');

  // Test 4: Broadcast Materi Baru ke Siswa
  console.log('🔹 Test 4: Verifikasi broadcast rilis materi baru kelas');
  const materialResult = await sendWhatsAppNewMaterial('085648077829', {
    studentName: 'Budi Santoso',
    courseTitle: 'Mastering Enterprise Backend Architecture',
    sectionTitle: 'Bab 3: Message Queue & Redis Caching',
    materialTitle: 'Implementasi Resilient Cache',
    contentType: 'video',
  });
  assert.strictEqual(materialResult.success, true);
  assert.strictEqual(materialResult.simulated, true);
  console.log('✅ Test 4 Passed: Notifikasi materi baru ke Siswa terkirim.');

  // Test 5: Alert Pendaftaran Calon Pengajar ke Admin
  console.log('🔹 Test 5: Verifikasi alert pendaftaran calon pengajar ke Admin');
  const appResult = await sendWhatsAppTutorApplicationAlert('085648077829', {
    adminName: 'Admin SkillSphere',
    applicantName: 'Satrio Wicaksono',
    applicantEmail: 'satrio@skillsphere.id',
    specialization: 'Cloud & DevOps Engineering',
  });
  assert.strictEqual(appResult.success, true);
  assert.strictEqual(appResult.simulated, true);
  console.log('✅ Test 5 Passed: Alert pengajuan tutor ke Admin terkirim.');

  // Test 6: Notifikasi Hasil Verifikasi ke Calon Pengajar (Disetujui & Ditolak)
  console.log('🔹 Test 6: Verifikasi notifikasi status persetujuan & penolakan Tutor');
  const approvedResult = await sendWhatsAppTutorApprovalStatus('085648077829', {
    applicantName: 'Satrio Wicaksono',
    isApproved: true,
  });
  assert.strictEqual(approvedResult.success, true);

  const rejectedResult = await sendWhatsAppTutorApprovalStatus('085648077829', {
    applicantName: 'Satrio Wicaksono',
    isApproved: false,
    notes: 'Sertifikasi kompetensi belum terlampir.',
  });
  assert.strictEqual(rejectedResult.success, true);
  console.log('✅ Test 6 Passed: Status verifikasi persetujuan/penolakan ke Tutor terkirim.');

  // Test 7: Alert Pengajuan Penarikan Dana ke Admin
  console.log('🔹 Test 7: Verifikasi alert pengajuan penarikan dana dompet ke Admin');
  const wdAlertResult = await sendWhatsAppWithdrawalAlertToAdmin('085648077829', {
    adminName: 'Admin SkillSphere',
    tutorName: 'Arjuna Lanang',
    amount: 1000000,
    bankName: 'BCA',
    accountNumber: '1234567890',
    accountHolder: 'Arjuna Lanang',
  });
  assert.strictEqual(wdAlertResult.success, true);
  console.log('✅ Test 7 Passed: Alert pengajuan penarikan dana ke Admin terkirim.');

  // Test 8: Status Penarikan Dana ke Tutor (Selesai & Ditolak)
  console.log('🔹 Test 8: Verifikasi notifikasi status transfer penarikan dana ke Tutor');
  const wdStatusSuccess = await sendWhatsAppWithdrawalStatusToTutor('085648077829', {
    tutorName: 'Arjuna Lanang',
    withdrawalId: '88',
    amount: 1000000,
    status: 'completed',
    bankName: 'BCA',
    accountNumber: '1234567890',
    proofUrl: 'https://demo.codingsolver.my.id/uploads/proofs/transfer-88.jpg',
  });
  assert.strictEqual(wdStatusSuccess.success, true);

  const wdStatusRejected = await sendWhatsAppWithdrawalStatusToTutor('085648077829', {
    tutorName: 'Arjuna Lanang',
    withdrawalId: '89',
    amount: 500000,
    status: 'rejected',
    bankName: 'BCA',
    accountNumber: '1234567890',
    notes: 'Nomor rekening dan nama pemilik tidak cocok.',
  });
  assert.strictEqual(wdStatusRejected.success, true);
  console.log('✅ Test 8 Passed: Status penyelesaian penarikan dana ke Tutor terkirim.');

  // Test 9: Pengingat Belajar Adaptif AI (Inactivity Reminder)
  console.log('🔹 Test 9: Verifikasi pesan pengingat belajar adaptif AI');
  const encouragement = await generateStudyEncouragement('Budi Santoso', 'Basis Data Lanjut', 50);
  assert.ok(typeof encouragement === 'string' && encouragement.length > 10);
  assert.ok(!encouragement.includes('—'), 'Pesan tidak boleh mengandung tanda em dash.');

  const reminderResult = await sendWhatsAppInactivityReminder('085648077829', {
    studentName: 'Budi Santoso',
    courseTitle: 'Basis Data Lanjut',
    progressPercentage: 50,
    aiEncouragement: encouragement,
  });
  assert.strictEqual(reminderResult.success, true);
  console.log('✅ Test 9 Passed: Pengingat belajar adaptif AI terkirim.');

  // Test 10: Inactivity Check & Batch Remind Service
  console.log('🔹 Test 10: Verifikasi layanan batch checkAndRemindInactiveStudents');
  const batchResult = await checkAndRemindInactiveStudents({ dryRun: true, forceAllActive: true });
  assert.ok(typeof batchResult.totalChecked === 'number');
  assert.ok(Array.isArray(batchResult.results));
  console.log(`✅ Test 10 Passed: Batch inactivity scanner memeriksa ${batchResult.totalChecked} enrollment aktif.`);

  console.log('\n🎉 ALL 10 NOTIFICATION TESTS PASSED SUCCESSFULLY! 🚀\n');
}

if (require.main === module) {
  runWhatsAppNotificationsTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Notification test failed:', err);
      process.exit(1);
    });
}

module.exports = runWhatsAppNotificationsTestSuite;
