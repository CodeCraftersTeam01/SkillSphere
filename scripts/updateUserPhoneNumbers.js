require('dotenv').config();
const { User, UserProfile, sequelize } = require('../models');

const TARGET_PHONE = '085648077829';

async function syncAllUserPhoneNumbers() {
  console.log(`🚀 Memulai sinkronisasi nomor WhatsApp (${TARGET_PHONE}) untuk seluruh pengguna...`);
  
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'role']
  });

  console.log(`📋 Ditemukan total ${users.length} pengguna (admin, tutor, student).`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const user of users) {
    const [profile, created] = await UserProfile.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        full_name: user.name,
        phone_number: TARGET_PHONE,
      }
    });

    if (created) {
      createdCount++;
    } else {
      if (profile.phone_number !== TARGET_PHONE) {
        profile.phone_number = TARGET_PHONE;
        await profile.save();
        updatedCount++;
      }
    }
  }

  console.log(`✅ Selesai! Profil baru dibuat: ${createdCount}, Profil diperbarui: ${updatedCount}.`);
  console.log(`📱 Seluruh ${users.length} akun (admin, tutor, student) kini menggunakan nomor ${TARGET_PHONE}.`);
}

if (require.main === module) {
  syncAllUserPhoneNumbers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Gagal sinkronisasi nomor telepon:', err);
      process.exit(1);
    });
}

module.exports = syncAllUserPhoneNumbers;
