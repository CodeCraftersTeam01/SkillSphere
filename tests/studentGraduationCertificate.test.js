const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const {
  User,
  UserProfile,
  Course,
  CourseSection,
  CourseMaterial,
  Category,
  Enrollment,
  Exam,
  ExamResult,
  Certificate,
} = require('../models');

const app = require('../app');
const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere-super-secret-jwt-key-2025';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function request(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let parsed = null;
        try { parsed = JSON.parse(buf.toString()); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed || buf.toString(),
          rawBuffer: buf,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runStudentGraduationCertificateTest() {
  console.log('\n========================================================================');
  console.log('🧪 PENGUJIAN KELULUSAN & PENERBITAN SERTIFIKAT DIGITAL SKILLSPHERE AI');
  console.log('========================================================================\n');

  let server;
  let port;

  try {
    // 1. Jalankan HTTP server ephemeral
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    const timestamp = Date.now();

    // 2. Setup Data Master: Tutor & Student
    console.log('🔹 Langkah 1: Persiapan Akun Pengajar (Tutor) dan Siswa (Student)...');
    const tutor = await User.create({
      name: `Tutor Arsitek ${timestamp}`,
      email: `tutor_cert_${timestamp}@skillsphere.test`,
      password: 'password123',
      role: 'tutor',
      is_verified: true,
    });
    const tutorToken = generateToken(tutor);

    const student = await User.create({
      name: `Budi Hartono ${timestamp}`,
      email: `budi_student_${timestamp}@skillsphere.test`,
      password: 'password123',
      role: 'student',
      is_verified: true,
    });
    const studentToken = generateToken(student);

    await UserProfile.create({
      user_id: student.id,
      bio: 'Siswa antusias software architecture',
      career_goal: 'Cloud & Enterprise Architect',
    });

    const category = await Category.create({
      name: `Cloud Engineering ${timestamp}`,
      slug: `cloud-engineering-${timestamp}`,
    });

    // 3. Setup Kursus dengan Modul Materi & Tugas
    console.log('🔹 Langkah 2: Pembuatan Kursus, Bab Materi, dan Tugas Pembelajaran...');
    const course = await Course.create({
      title: `Mastering Distributed Microservices & Cloud Native ${timestamp}`,
      slug: `mastering-microservices-${timestamp}`,
      description: 'Kurikulum mendalam arsitektur microservices terdistribusi.',
      category_id: category.id,
      tutor_id: tutor.id,
      price: 650000,
      status: 'published',
      level: 'advanced',
    });

    const section1 = await CourseSection.create({
      course_id: course.id,
      title: 'Bab 1: Fondasi Arsitektur Sistem Terdistribusi',
      sort_order: 1,
    });

    const material1 = await CourseMaterial.create({
      section_id: section1.id,
      title: 'Modul 1: Distributed Transactions & Saga Pattern',
      content_type: 'video',
      file_url: '/uploads/videos/saga-pattern.mp4',
      duration: 1800,
      order_index: 1,
    });

    const material2 = await CourseMaterial.create({
      section_id: section1.id,
      title: 'Modul 2: Tugas Praktek Implementasi Event Sourcing',
      content_type: 'pdf',
      file_url: '/uploads/documents/event-sourcing.pdf',
      content_text: 'Tugas membuat event bus dengan Kafka dan Redis Pub/Sub.',
      duration_minutes: 40,
      order_index: 2,
    });

    console.log(`  ✔ Kursus ID [${course.id}] dan 2 Modul Materi berhasil diinisialisasi.`);

    // 4. Tutor Membuat Ujian Akhir Kelulusan Resmi
    console.log('🔹 Langkah 3: Pengajar Mempublikasikan Ujian Akhir Kelulusan (Final Graduation Exam)...');
    const examCreateRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: '/api/exams',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tutorToken}`,
      },
    }, {
      course_id: course.id,
      exam_type: 'final',
      title: 'Ujian Kelulusan Resmi: Distributed Systems Architect',
      description: 'Syarat kelulusan standar industri dengan nilai minimal 75%.',
      passing_score: 75,
      duration_minutes: 45,
      questions: [
        {
          id: '1',
          question: 'Bagaimana cara mengatasi konsistensi data pada pola Saga?',
          options: ['Choreography & Orchestration', 'Single monolithic DB', 'Menghapus log', 'Restart server'],
          correct_answer: 'A',
          points: 50,
        },
        {
          id: '2',
          question: 'Apa keuntungan utama asynchronous messaging dengan message broker?',
          options: ['Tightly coupled components', 'Loose coupling & High scalability', 'Memperlambat request', 'Menghilangkan security'],
          correct_answer: 'B',
          points: 50,
        },
      ],
    });

    assert.strictEqual(examCreateRes.status, 201, 'Ujian harus berhasil dibuat dengan HTTP 201');
    assert.strictEqual(examCreateRes.data.success, true);
    const examId = examCreateRes.data.data.id;
    console.log(`  ✔ Ujian Kelulusan ID [${examId}] berhasil dibuat (Passing Score: 75%).`);

    // 5. Siswa Mendaftar Kursus (Enrollment Awal: Progress 0%)
    console.log('🔹 Langkah 4: Pendaftaran Siswa ke Kursus (Enrollment Status Awal: 0%)...');
    const enrollment = await Enrollment.create({
      user_id: student.id,
      course_id: course.id,
      status: 'active',
      progress_percentage: 0,
      enrolled_at: new Date(),
    });
    assert.strictEqual(enrollment.status, 'active');
    assert.strictEqual(enrollment.progress_percentage, 0);
    console.log('  ✔ Siswa terdaftar dengan status: active, progres: 0%.');

    // 6. Siswa Menyelesaikan Tugas & Modul Materi Secara Bertahap
    console.log('🔹 Langkah 5: Siswa Menyelesaikan Tugas & Materi (Update Progres Bertahap)...');
    
    // Selesai Modul 1 (50%)
    const progressRes1 = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/courses/${course.id}/progress`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    }, {
      progress_percentage: 50,
      status: 'active',
    });
    assert.strictEqual(progressRes1.status, 200);
    assert.strictEqual(progressRes1.data.data.progress_percentage, 50);
    console.log('  ✔ Siswa menyelesaikan Modul 1: Progres sinkron ke 50%.');

    // Selesai Modul 2 / Tugas Praktek (100%)
    const progressRes2 = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/courses/${course.id}/progress`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    }, {
      progress_percentage: 100,
      status: 'completed',
    });
    assert.strictEqual(progressRes2.status, 200);
    assert.strictEqual(progressRes2.data.data.progress_percentage, 100);
    console.log('  ✔ Siswa menuntaskan seluruh tugas materi: Progres sinkron ke 100%.');

    // 7. Pengujian Kasus Negatif: Siswa Mengerjakan Ujian Tapi Nilai Belum Lulus (< 75%)
    console.log('🔹 Langkah 6: Uji Coba Ujian - Siswa Mengerjakan Jawaban Salah (Nilai < 75%)...');
    const failSubmitRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/exams/${examId}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    }, {
      answers: { '1': 'B', '2': 'C' }, // Dua-duanya salah
      time_spent_seconds: 60,
    });

    assert.strictEqual(failSubmitRes.status, 200);
    assert.strictEqual(failSubmitRes.data.data.is_passed, false, 'Hasil ujian harus tidak lulus');
    assert.strictEqual(failSubmitRes.data.data.score, 0, 'Skor harus 0');
    assert.strictEqual(failSubmitRes.data.data.certificate, null, 'Sertifikat TIDAK BOLEH terbit jika nilai di bawah passing grade');
    console.log('  ✔ Validasi Berhasil: Nilai 0% (< 75%) tidak menerbitkan sertifikat.');

    // 8. Pengujian Kasus Positif: Siswa Mengikuti Ujian Kelulusan & Lulus Nilai Sempurna (100%)
    console.log('🔹 Langkah 7: Siswa Mengikuti Kembali Ujian Kelulusan & Lulus (Nilai 100%)...');
    const passSubmitRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/exams/${examId}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    }, {
      answers: { '1': 'A', '2': 'B' }, // Dua-duanya benar
      time_spent_seconds: 150,
    });

    assert.strictEqual(passSubmitRes.status, 200);
    assert.strictEqual(passSubmitRes.data.data.is_passed, true, 'Siswa harus dinyatakan LULUS');
    assert.strictEqual(passSubmitRes.data.data.score, 100, 'Skor harus 100');
    assert(passSubmitRes.data.data.certificate, 'Objek sertifikat harus otomatis diterbitkan');
    
    const issuedCert = passSubmitRes.data.data.certificate;
    const certCode = issuedCert.certificate_code;
    assert(certCode && certCode.startsWith('CERT-'), 'Nomor sertifikat resmi harus berformat CERT-xxx');
    console.log(`  ✔ Ujian Berhasil Lulus! Nilai: 100% | Sertifikat Resmi Terbit: [${certCode}]`);

    // 9. Verifikasi Data Sertifikat di Database MySQL
    console.log('🔹 Langkah 8: Verifikasi Integritas Data Sertifikat di Database...');
    const certRecordInDb = await Certificate.findOne({
      where: { certificate_code: certCode },
    });
    assert(certRecordInDb, 'Record sertifikat wajib tercatat di tabel certificates');
    assert.strictEqual(certRecordInDb.user_id, student.id, 'Sertifikat harus milik siswa bersangkutan');
    assert.strictEqual(certRecordInDb.course_id, course.id, 'Sertifikat harus untuk kursus bersangkutan');
    console.log(`  ✔ Integritas Database Valid: User ID ${certRecordInDb.user_id}, Course ID ${certRecordInDb.course_id}`);

    // 10. Verifikasi Portofolio Sertifikat Siswa (/api/certificates/my-certificates)
    console.log('🔹 Langkah 9: Verifikasi Akses Portofolio Sertifikat Siswa...');
    const myCertsRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: '/api/certificates/my-certificates',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    assert.strictEqual(myCertsRes.status, 200);
    assert.strictEqual(myCertsRes.data.success, true);
    const certList = myCertsRes.data.data;
    const foundCert = certList.find((c) => c.certificate_code === certCode);
    assert(foundCert, 'Sertifikat baru harus muncul dalam portofolio siswa');
    console.log(`  ✔ Portofolio Siswa Berhasil Memuat Sertifikat: ${foundCert.course_title}`);

    // 11. Verifikasi Validasi Kredensial Publik (/api/certificates/verify/:code)
    console.log('🔹 Langkah 10: Verifikasi Publik Kredensial Keaslian Sertifikat...');
    const verifyApiRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/certificates/verify/${certCode}`,
      method: 'GET',
    });
    assert.strictEqual(verifyApiRes.status, 200);
    assert.strictEqual(verifyApiRes.data.success, true);
    assert.strictEqual(verifyApiRes.data.data.is_valid, true);
    assert.strictEqual(verifyApiRes.data.data.student_name, student.name);
    assert.strictEqual(verifyApiRes.data.data.exam_score, 100);
    console.log(`  ✔ API Verifikasi Publik Mengonfirmasi Keaslian: Lulus (Nilai: ${verifyApiRes.data.data.exam_score}%)`);

    // 12. Verifikasi Halaman Web Publik Verifikasi (/verify-cert/:code)
    console.log('🔹 Langkah 11: Verifikasi Tampilan Halaman Web Publik Sertifikat (/verify-cert/:code)...');
    const webViewRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/verify-cert/${certCode}`,
      method: 'GET',
    });
    assert.strictEqual(webViewRes.status, 200);
    assert(webViewRes.data.includes(certCode), 'Halaman web harus memuat nomor sertifikat');
    assert(webViewRes.data.includes(student.name), 'Halaman web harus memuat nama siswa');
    console.log('  ✔ Halaman Web Verifikasi Publik (Warm Paper Aesthetic) Berhasil Dirender.');

    // 13. Verifikasi Pengunduhan Dokumen Fisik PDF Resmi (/api/certificates/:code/pdf)
    console.log('🔹 Langkah 12: Verifikasi Unduhan Berkas PDF Sertifikat Resmi Berstempel QR Code...');
    const pdfRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/certificates/${certCode}/pdf`,
      method: 'GET',
    });
    assert.strictEqual(pdfRes.status, 200);
    assert(pdfRes.headers['content-type'].includes('application/pdf'), 'Header Content-Type harus application/pdf');
    assert(pdfRes.rawBuffer.length > 1000, 'Berkas PDF harus memiliki ukuran valid');
    console.log(`  ✔ File PDF Sertifikat Berhasil Di-stream: Ukuran ${pdfRes.rawBuffer.length} bytes.`);

    console.log('\n========================================================================');
    console.log('🎉 SELURUH PENGUJIAN SELESAI: 100% SUKSES!');
    console.log('Siswa yang menyelesaikan tugas/materi dan lulus ujian akhir dipastikan');
    console.log('MENDAPATKAN SERTIFIKAT KELULUSAN RESMI OTOMATIS.');
    console.log('========================================================================\n');

  } catch (err) {
    console.error('\n❌ Pengujian Gagal:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

// Jalankan pengujian
runStudentGraduationCertificateTest().then(() => {
  process.exit(0);
});
