const { buildStudentLearningRadar } = require('../services/studentRadarService');

async function getLearningRadar(req, res) {
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan untuk mengakses data grafik radar pembelajaran.',
    });
  }

  try {
    const radarData = await buildStudentLearningRadar(userId);
    return res.status(200).json({
      success: true,
      message: 'Data grafik radar pembelajaran siswa berhasil dimuat.',
      data: radarData,
    });
  } catch (error) {
    console.error('[studentAnalyticsController.getLearningRadar]', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat data grafik radar pembelajaran siswa.',
    });
  }
}

module.exports = {
  getLearningRadar,
};
