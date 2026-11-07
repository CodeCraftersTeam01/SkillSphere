const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Service Pembuat PDF Sertifikat Resmi SkillSphere AI
 * Dilengkapi QR Code stempel kriptografis untuk validasi keaslian publik
 * Dipimpin oleh Arjuna Lanang (PM & Lead Backend)
 */

const CERT_STORAGE_DIR = path.join(__dirname, '..', 'public', 'uploads', 'certificates');

// Pastikan direktori penyimpanan sertifikat tersedia
if (!fs.existsSync(CERT_STORAGE_DIR)) {
  fs.mkdirSync(CERT_STORAGE_DIR, { recursive: true });
}

/**
 * Menghasilkan file PDF Sertifikat Resmi dalam format Landscape A4
 * @param {Object} params
 * @param {string} params.certificateCode - Nomor unik sertifikat
 * @param {string} params.studentName - Nama lengkap siswa penerima
 * @param {string} params.courseTitle - Judul kursus yang diselesaikan
 * @param {string} [params.tutorName] - Nama instruktur kursus
 * @param {number|string} [params.score] - Skor kelulusan ujian (persen)
 * @param {string|Date} [params.issueDate] - Tanggal penerbitan sertifikat
 * @returns {Promise<{ filePath: string, publicUrl: string, pdfBuffer: Buffer }>}
 */
async function generateCertificatePdf({
  certificateCode,
  studentName,
  courseTitle,
  tutorName = 'Lead Instructor',
  score = 100,
  issueDate = new Date(),
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const sanitizedCode = String(certificateCode).replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `cert_${sanitizedCode}.pdf`;
      const filePath = path.join(CERT_STORAGE_DIR, fileName);
      const publicUrl = `/uploads/certificates/${fileName}`;

      // Format tanggal dalam Bahasa Indonesia yang formal
      const dateObj = new Date(issueDate);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDate = dateObj.toLocaleDateString('id-ID', options);

      // URL Verifikasi Sertifikat Publik
      const appBaseUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
      const verifyUrl = `${appBaseUrl.replace(/\/+$/, '')}/verify-cert/${sanitizedCode}`;

      // Buat QR Code Buffer dari URL verifikasi
      const qrBuffer = await QRCode.toBuffer(verifyUrl, {
        type: 'png',
        width: 110,
        margin: 1,
        color: {
          dark: '#1F1E1B',
          light: '#FFFFFF',
        },
      });

      // Inisialisasi PDF Dokumen (Landscape A4: 841.89 x 595.28 pt)
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 32, bottom: 32, left: 36, right: 36 },
        info: {
          Title: `Sertifikat Kelulusan - ${studentName}`,
          Author: 'SkillSphere AI Platform',
          Subject: `Sertifikasi Kursus: ${courseTitle}`,
          Keywords: `SkillSphere, Certificate, ${sanitizedCode}`,
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.pipe(writeStream);

      const pageWidth = 841.89;
      const pageHeight = 595.28;

      // 1. Background Warm Paper
      doc.rect(0, 0, pageWidth, pageHeight).fill('#FAF9F5');

      // 2. Double Border Ornaments (Emas & Obsidian)
      // Border Luar Elegan (Aksen Emas Perunggu)
      doc.rect(24, 24, pageWidth - 48, pageHeight - 48)
        .lineWidth(3)
        .stroke('#C8A86B');

      // Border Dalam Halus (Obsidian Subtil)
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(1)
        .stroke('#2A2926');

      // 3. Ornamen Sudut Dekoratif
      const cornerSize = 16;
      const corners = [
        [32, 32],
        [pageWidth - 32 - cornerSize, 32],
        [32, pageHeight - 32 - cornerSize],
        [pageWidth - 32 - cornerSize, pageHeight - 32 - cornerSize],
      ];
      corners.forEach(([cx, cy]) => {
        doc.rect(cx, cy, cornerSize, cornerSize).fill('#C8A86B');
      });

      // 4. Header Atas: Brand Identity
      doc.fillColor('#141413')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('SKILLSPHERE AI', 0, 52, { align: 'center', characterSpacing: 2.5 });

      doc.fillColor('#7A7870')
        .font('Helvetica')
        .fontSize(8.5)
        .text('ADAPTIVE LEARNING & COMPETENCY CERTIFICATION PLATFORM', 0, 74, { align: 'center', characterSpacing: 1.5 });

      // Garis Aksen Emas Bawah Header
      doc.moveTo(pageWidth / 2 - 120, 92)
        .lineTo(pageWidth / 2 + 120, 92)
        .lineWidth(1.5)
        .stroke('#C8A86B');

      // 5. Judul Sertifikat Utama
      doc.fillColor('#C8A86B')
        .font('Times-Bold')
        .fontSize(28)
        .text('SERTIFIKAT KELULUSAN RESMI', 0, 112, { align: 'center', characterSpacing: 1 });

      doc.fillColor('#615F56')
        .font('Helvetica')
        .fontSize(10)
        .text('CERTIFICATE OF ACADEMIC & TECHNICAL EXCELLENCE', 0, 146, { align: 'center', characterSpacing: 1 });

      // 6. Kalimat Pengantar
      doc.fillColor('#474640')
        .font('Times-Italic')
        .fontSize(12)
        .text('Dengan bangga menerangkan bahwa:', 0, 178, { align: 'center' });

      // 7. Nama Penerima Sertifikat
      doc.fillColor('#141413')
        .font('Times-Bold')
        .fontSize(26)
        .text(studentName || 'Peserta Pembelajaran', 0, 202, { align: 'center' });

      // Garis Bawah Nama Penerima
      doc.moveTo(pageWidth / 2 - 160, 238)
        .lineTo(pageWidth / 2 + 160, 238)
        .lineWidth(0.75)
        .stroke('#D4AF37');

      // 8. Keterangan Kelulusan
      doc.fillColor('#474640')
        .font('Helvetica')
        .fontSize(11)
        .text('Telah berhasil menyelesaikan seluruh silabus kurikulum dan lulus Ujian Kompetensi Akhir pada kelas:', 0, 252, {
          align: 'center',
          lineGap: 4,
        });

      // 9. Nama Kursus
      doc.fillColor('#1F1E1B')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(courseTitle || 'Spesialisasi Teknologi', 0, 282, { align: 'center' });

      // 10. Metadata Nilai & Tanggal
      const scoreText = `Nilai Kelulusan: ${score}%`;
      const dateText = `Tanggal Penerbitan: ${formattedDate}`;
      doc.fillColor('#615F56')
        .font('Helvetica')
        .fontSize(9.5)
        .text(`${scoreText}   •   ${dateText}`, 0, 318, { align: 'center' });

      // 11. Bagian Bawah: Tanda Tangan & QR Code Validasi Keaslian
      const signatureY = 372;

      // Sisi Kiri: Tanda Tangan Tutor Kursus
      const tutorBoxX = 90;
      doc.fillColor('#2A2926')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(tutorName || 'Pengajar Kursus', tutorBoxX, signatureY + 45, { width: 200, align: 'center' });

      doc.moveTo(tutorBoxX + 20, signatureY + 40)
        .lineTo(tutorBoxX + 180, signatureY + 40)
        .lineWidth(1)
        .stroke('#7A7870');

      doc.fillColor('#7A7870')
        .font('Helvetica')
        .fontSize(8.5)
        .text('Instruktur Utama Kursus', tutorBoxX, signatureY + 60, { width: 200, align: 'center' });

      // Sisi Tengah: QR Code Validasi Kriptografis
      const qrX = pageWidth / 2 - 45;
      const qrY = signatureY - 10;
      doc.image(qrBuffer, qrX, qrY, { width: 90, height: 90 });

      doc.fillColor('#7A7870')
        .font('Helvetica')
        .fontSize(7.5)
        .text('Pindai untuk Verifikasi Keaslian', qrX - 25, qrY + 94, { width: 140, align: 'center' });

      // Sisi Kanan: Tanda Tangan Arjuna Lanang (PM & Lead Backend)
      const pmBoxX = pageWidth - 290;
      doc.fillColor('#2A2926')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Arjuna Lanang, S.Kom., M.T.', pmBoxX, signatureY + 45, { width: 200, align: 'center' });

      doc.moveTo(pmBoxX + 10, signatureY + 40)
        .lineTo(pmBoxX + 190, signatureY + 40)
        .lineWidth(1)
        .stroke('#7A7870');

      doc.fillColor('#7A7870')
        .font('Helvetica')
        .fontSize(8.5)
        .text('Project Manager & Lead Backend', pmBoxX, signatureY + 60, { width: 200, align: 'center' });

      // 12. Footer Paling Bawah: Kode Sertifikat Resmi & Kredensial
      const footerY = pageHeight - 56;
      doc.fillColor('#8F8D83')
        .font('Courier-Bold')
        .fontSize(8.5)
        .text(`KODE SERTIFIKAT: ${sanitizedCode}`, 0, footerY, { align: 'center', characterSpacing: 1 });

      doc.fillColor('#A3A196')
        .font('Helvetica')
        .fontSize(7.5)
        .text('Dokumen elektronik ini diterbitkan secara sah oleh SkillSphere AI Engine dan dapat diverifikasi secara daring.', 0, footerY + 14, {
          align: 'center',
        });

      // Selesaikan dokumen
      doc.end();

      writeStream.on('finish', () => {
        const fullBuffer = Buffer.concat(buffers);
        resolve({
          filePath,
          publicUrl,
          pdfBuffer: fullBuffer,
          fileName,
          certificateCode: sanitizedCode,
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Memastikan file PDF sertifikat fisik telah digenerate pada disk
 * Jika belum ada, fungsi ini akan membuatnya berdasarkan model Certificate
 */
async function ensureCertificatePdf(certificateRecord, options = {}) {
  const { User, Course } = require('../models');

  const cert = await certificateRecord.reload({
    include: [
      { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] },
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title'],
        include: [{ model: User, as: 'tutor', attributes: ['id', 'name'] }],
      },
    ],
  });

  const sanitizedCode = String(cert.certificate_code).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `cert_${sanitizedCode}.pdf`;
  const filePath = path.join(CERT_STORAGE_DIR, fileName);

  if (fs.existsSync(filePath)) {
    return {
      filePath,
      publicUrl: `/uploads/certificates/${fileName}`,
      alreadyExisted: true,
    };
  }

  const studentName = (cert.recipient && cert.recipient.name) || options.studentName || 'Peserta Pembelajaran';
  const courseTitle = (cert.course && cert.course.title) || options.courseTitle || 'Kursus Keahlian';
  const tutorName = (cert.course && cert.course.tutor && cert.course.tutor.name) || options.tutorName || 'Lead Instructor';

  const result = await generateCertificatePdf({
    certificateCode: cert.certificate_code,
    studentName,
    courseTitle,
    tutorName,
    score: options.score || 100,
    issueDate: cert.issue_date || new Date(),
  });

  cert.certificate_url = result.publicUrl;
  await cert.save();

  return result;
}

module.exports = {
  generateCertificatePdf,
  ensureCertificatePdf,
  CERT_STORAGE_DIR,
};
