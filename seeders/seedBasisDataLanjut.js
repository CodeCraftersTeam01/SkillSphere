require('dotenv').config();
const { Course, CourseSection, CourseMaterial, Category, User } = require('../models');
const sequelize = require('../config/database');

const materialsContent = {
  materi1: `
## 1. Pengantar Fundamental: Mengapa Perlu Normalisasi Data?

Bayangkan Anda memiliki sebuah buku catatan besar di mana setiap kali ada mahasiswa mengambil mata kuliah, Anda mencatat seluruh nama mahasiswa, alamat rumah, nomor HP, nama mata kuliah, jumlah SKS, hingga nama dosen dan ruangan kelas berulang-ulang di setiap baris.

Ketika seorang mahasiswa mengambil 5 mata kuliah berbeda, Anda menuliskan alamat rumah mahasiswa tersebut sebanyak 5 kali. Apa yang terjadi jika mahasiswa tersebut pindah rumah? Anda harus mencari dan memperbarui 5 baris data sekaligus. Jika ada 1 baris yang terlewat, data alamat mahasiswa menjadi kacau dan bertolak belakang. Inilah masalah klasik yang dipecahkan oleh **Normalisasi Basis Data**.

---

## 2. Definisi & Konsep Normalisasi Data

Berdasarkan teori relational database yang digagas oleh **Dr. E. F. Codd**:

> **Normalisasi** merupakan sebuah teknik dalam *logical design* sebuah basis data yang mengelompokkan atribut-atribut dari suatu relasi sehingga membentuk struktur relasi yang baik, efisien, dan bebas dari redudansi (kerangkapan data yang tidak perlu).

Tujuan fundamental dari normalisasi:
1. **Menghilangkan Kerangkapan Data (*Data Redundancy*)**: Menghemat ruang penyimpanan dan mencegah duplikasi informasi.
2. **Mengurangi Kompleksitas Relasi**: Membagi tabel raksasa (universal table) menjadi struktur tabel-tabel spesifik yang fokus pada satu entitas.
3. **Mencegah Tiga Anomali Database**: Mempermudah operasi manipulasi data (Insert, Update, Delete) tanpa efek samping yang merusak integritas data.

---

## 3. Bahaya Tanpa Normalisasi: Tiga Anomali Database

Jika basis data tidak dinormalisasi dengan baik, sistem akan mengalami tiga anomali fatal berikut:

### A. Anomali Penyisipan (Insertion Anomaly)
Kondisi di mana sistem **tidak dapat menambahkan data baru** karena adanya ketergantungan pada entitas lain yang belum ada.
- *Contoh Kasus*: Anda ingin mendaftarkan mata kuliah baru bernama *\"Machine Learning Enterprise\"*. Namun karena rancangan tabel menggabungkan data mahasiswa dan mata kuliah dalam satu tabel nilai, sistem menolak menyimpan mata kuliah tersebut sebelum ada mahasiswa pertama yang mengontraknya.

### B. Anomali Pembaruan (Update Anomaly)
Kondisi di mana **pembaruan data pada satu tempat menimbulkan inkonsistensi** karena data yang sama disimpan di banyak baris.
- *Contoh Kasus*: Mahasiswa bernama *Welli* memperbarui alamatnya. Jika sistem hanya mengupdate 2 baris dari 5 baris Kartu Rencana Studi milik Welli, maka database akan memiliki dua alamat berbeda untuk satu orang yang sama.

### C. Anomali Penghapusan (Deletion Anomaly)
Kondisi di mana **penghapusan satu informasi menyebabkan data penting lainnya ikut terhapus secara tidak sengaja**.
- *Contoh Kasus*: Mahasiswa *Bakri* adalah satu-satunya mahasiswa yang mengambil mata kuliah *\"Akuntansi Keuangan\"*. Ketika Bakri membatalkan mata kuliah tersebut dan baris datanya dihapus, informasi tentang keberadaan mata kuliah *Akuntansi Keuangan* beserta dosen pengampunya ikut terhapus lenyap dari sistem.

---

## 4. Tiga Syarat Basis Data Normal yang Ideal

Sebuah proses dekomposisi tabel dikatakan berhasil dan normal apabila memenuhi tiga kriteria emas:
1. **Lossless-Join Decomposition (Dekomposisi Tanpa Kehilangan Informasi)**:
   Setelah tabel besar dipecah menjadi beberapa tabel kecil, tabel-tabel tersebut harus bisa digabungkan kembali (*JOIN*) menggunakan foreign key dan menghasilkan data awal yang sama persis tanpa ada baris data silang fiktif (*spurious tuples*).
2. **Dependency Preservation (Pemeliharaan Ketergantungan Fungsional)**:
   Seluruh relasi ketergantungan antar-atribut tetap dapat ditegakkan tanpa harus melakukan join antar semua tabel setiap saat.
3. **Memenuhi Bentuk Normal Minimum (Minimal 3NF / BCNF)**:
   Tabel tidak melanggar kriteria Bentuk Normal Ketiga (3NF) atau Boyce-Codd Normal Form (BCNF).
`,

  materi2: `
## 1. Apa Itu Ketergantungan Fungsional (Functional Dependency)?

Sebelum memahami tahapan normalisasi (1NF, 2NF, 3NF), Anda wajib menguasai konsep **Ketergantungan Fungsional (*Functional Dependency* / FD)**.

Ketergantungan fungsional adalah hubungan matematis antara satu atribut dengan atribut lainnya dalam satu entitas (tabel). 

### Notasi Standar:
\`\`\`text
A -> B
\`\`\`
- Dibaca: **\"A secara fungsional menentukan B\"** atau **\"B bergantung secara fungsional pada A\"**.
- **Makna Logis**: Jika ada dua baris data yang memiliki nilai atribut \`A\` yang sama, maka nilai atribut \`B\` pada kedua baris tersebut **pasti sama persis**.

> **Analogi Sederhana**:
> \`Nomor Induk Kependudukan (NIK) -> Nama Lengkap\`
> Karena NIK bersifat unik untuk setiap individu di Indonesia, jika Anda mengetahui NIK seseorang, Anda secara pasti mengetahui nama lengkap orang tersebut.

---

## 2. Tiga Jenis Ketergantungan Fungsional

Dalam dokumen kuliah Normalisasi Data, ketergantungan fungsional dikelompokkan ke dalam 3 jenis utama:

### 1. Full Functional Dependency (Ketergantungan Penuh)
Atribut \`B\` dikatakan bergantung penuh pada atribut \`A\` jika atribut \`B\` hanya dapat ditentukan oleh seluruh bagian dari atribut \`A\` secara utuh, bukan oleh sebagian saja.

- **Contoh Kasus**: Pada tabel Penilaian Akademik dengan Composite Primary Key gabungan \`{NIM, Kode_MK}\`:
\`\`\`text
{NIM, Kode_MK} -> Nilai_Huruf
\`\`\`
- *Penjelasan*: Nilai huruf (misal: 'A') tidak bisa ditentukan hanya dengan \`NIM\` saja (karena satu mahasiswa punya banyak nilai untuk berbagai mata kuliah), dan juga tidak bisa ditentukan hanya dengan \`Kode_MK\` saja (karena satu mata kuliah diambil oleh banyak mahasiswa). Nilai huruf **bergantung penuh** pada kombinasi kedua kunci tersebut secara bersamaan.

### 2. Partial Dependency (Ketergantungan Parsial / Sebagian)
Kondisi di mana atribut non-kunci **hanya bergantung pada sebagian atribut** dari Primary Key gabungan (*composite key*).

- **Contoh Kasus**: Perhatikan relasi berikut dengan kunci gabungan \`{NIM, Kode_MK}\`:
\`\`\`text
{NIM, Kode_MK} -> Nama_Mahasiswa
\`\`\`
- *Masalah*: Atribut \`Nama_Mahasiswa\` sebenarnya hanya membutuhkan \`NIM\` untuk diketahui, sama sekali tidak membutuhkan \`Kode_MK\`.
- \`NIM -> Nama_Mahasiswa\` adalah ketergantungan parsial.
- **Dampak Buruk**: Ketergantungan parsial inilah yang melanggar aturan **Bentuk Normal Kedua (2NF)**.

### 3. Transitive Dependency (Ketergantungan Transitif / Tidak Langsung)
Kondisi ketergantungan fungsional antara atribut-atribut yang **bukan kunci utama (*non-primary key*)**.

- **Rumus Formal**: Jika \`A -> B\` dan \`B -> C\`, maka secara tidak langsung \`A -> C\`. Di mana \`B\` bukan calon kunci (*candidate key*).
- **Contoh Kasus Tabel Mahasiswa**:
  - \`NIM -> Kode_Pos\` (NIM menentukan lokasi kode pos domisili).
  - \`Kode_Pos -> {Kota, Provinsi}\` (Kode pos menentukan nama kota dan provinsi).
- *Masalah*: Atribut \`Kota\` dan \`Provinsi\` adalah non-key yang bergantung pada \`Kode_Pos\` (yang juga merupakan non-key).
- **Dampak Buruk**: Ketergantungan transitif inilah yang melanggar aturan **Bentuk Normal Ketiga (3NF)**.
`,

  materi3: `
## 1. Peta Jalan Tahapan Normalisasi

Normalisasi berjalan secara bertahap mulai dari tingkat paling longgar hingga tingkat paling ketat:

\`\`\`text
[ Tabel Universal / UNF ]
          |  (Hilangkan atribut multi-value & komposit)
          v
       [ 1NF ]
          |  (Hilangkan ketergantungan parsial)
          v
       [ 2NF ]
          |  (Hilangkan ketergantungan transitif)
          v
       [ 3NF ]  <-- Standar Umum Industri
          |  (Setiap penentu harus berupa super key)
          v
      [ BCNF ]
          |  (Hilangkan multi-valued dependency)
          v
    [ 4NF & 5NF ]
\`\`\`

Pada kebanyakan implementasi industri perangkat lunak, perancangan basis data **cukup diselesaikan hingga tahap 3NF atau BCNF** karena sudah sangat memadai dalam menghasilkan skema yang kokoh, berkinerja tinggi, dan bersih dari anomali.

---

## 2. Bedah Aturan Setiap Bentuk Normal

### A. Bentuk Normal Pertama (1st Normal Form / 1NF)
Sebuah tabel memenuhi 1NF jika dan hanya jika:
1. **Tidak Ada Atribut Multi-Value**: Setiap sel data hanya boleh menyimpan satu nilai tunggal (*atomic value*), tidak boleh berupa daftar yang dipisahkan koma seperti \`\"Renang, Basket, Musik\"\`.
2. **Tidak Ada Atribut Komposit**: Atribut yang terdiri dari beberapa sub-informasi wajib dipecah menjadi kolom mandiri (misal: kolom \`Jadwal: \"Senin, 08.00\"\" dipecah menjadi \`Hari\` dan \`Jam\`).
3. **Mendefinisikan Kunci Utama (*Primary Key*)**: Memiliki minimal satu kolom atau kombinasi kolom yang unik untuk membedakan setiap baris record.

### B. Bentuk Normal Kedua (2nd Normal Form / 2NF)
Sebuah tabel memenuhi 2NF jika dan hanya jika:
1. Sudah berada dalam bentuk **1NF**.
2. **Tidak Ada Ketergantungan Parsial (*No Partial Dependency*)**: Seluruh atribut yang bukan kunci harus bergantung secara penuh pada seluruh komponen Primary Key.
3. *Langkah Perbaikan*: Atribut yang hanya bergantung pada sebagian kunci dipisahkan ke tabel baru, dan dihubungkan kembali menggunakan relasi *Foreign Key*.

### C. Bentuk Normal Ketiga (3rd Normal Form / 3NF)
Sebuah tabel memenuhi 3NF jika dan hanya jika:
1. Sudah berada dalam bentuk **2NF**.
2. **Tidak Ada Ketergantungan Transitif (*No Transitive Dependency*)**: Tidak ada atribut non-kunci yang bergantung pada atribut non-kunci lainnya.
3. *Langkah Perbaikan*: Pisahkan atribut non-kunci yang saling bergantung ke dalam tabel referensi khusus (misal: memisahkan master \`Kode_Pos\`, \`Kota\`, \`Provinsi\`).

### D. Boyce-Codd Normal Form (BCNF)
BCNF adalah penyempurnaan yang lebih ketat dari 3NF:
- Setiap tabel dalam BCNF pasti memenuhi 3NF, tetapi tabel 3NF belum tentu BCNF.
- **Aturan Inti**: Untuk setiap *functional dependency* \`X -> Y\`, maka \`X\` **wajib merupakan Super Key / Candidate Key**.
- BCNF melarang adanya ketergantungan di mana atribut penentu (*determinant*) bukan merupakan calon kunci utama.

### E. Sekilas Bentuk Lanjutan (4NF & 5NF)
- **4NF (Fourth Normal Form)**: Terpenuhi jika sudah BCNF dan tidak memiliki *Multi-Valued Dependencies* (MVD) independen. Misalnya jika seorang karyawan memiliki banyak proyek independen dan banyak sertifikasi keahlian independen, tabel dipecah menjadi \`(Karyawan, Proyek)\` dan \`(Karyawan, Keahlian)\`.
- **5NF (Fifth Normal Form / Project-Join NF)**: Terpenuhi jika tabel tidak dapat diuraikan lagi secara *lossless* tanpa menggunakan *join dependency* kompleks.
`,

  materi4: `
## 1. Studi Kasus Riil: Sistem Kartu Rencana Studi (KRS)

Mari kita bedah contoh dari slide kuliah pertemuan 1, di mana kita memiliki laporan data perkuliahan mahasiswa berikut:

### Data Mentah (Tabel Universal / Unnormalized Form):
\`\`\`text
No_Mhs | Nama_Mhs | Jurusan | Kode_MK | Nama_MK              | Kode_Dosen | Nama_Dosen | Nilai
2683   | Welli    | MI      | MI350   | Manajemen Basis Data | B104       | Ati        | A
2683   | Welli    | MI      | MI465   | Analisis Prc. Sistem | B317       | Dita       | B
5432   | Bakri    | AK      | MI350   | Manajemen Basis Data | B104       | Ati        | C
5432   | Bakri    | AK      | AKN201  | Akuntansi Keuangan   | D310       | Lia        | B
5432   | Bakri    | AK      | MKT300  | Dasar Pemasaran      | B212       | Lola       | A
\`\`\`

---

## 2. Tahap 1: Evaluasi Bentuk Normal Pertama (1NF)

Pada tabel di atas:
- Seluruh kolom telah bernilai atomik (tidak ada cell yang berisi array koma).
- Kunci utama yang mengidentifikasi baris penilaian secara unik adalah gabungan: \`{No_Mhs, Kode_MK}\`.
- **Status**: Tabel ini **sudah 1NF**, namun belum efisien karena banyak pengulangan nama mahasiswa dan nama dosen.

---

## 3. Tahap 2: Transformasi Menuju Bentuk Normal Kedua (2NF)

Kita petakan seluruh Functional Dependency yang ada:
1. \`{No_Mhs, Kode_MK} -> Nilai\` *(Bergantung Penuh)*
2. \`No_Mhs -> {Nama_Mhs, Jurusan}\` *(Ketergantungan Parsial pada No_Mhs)*
3. \`Kode_MK -> {Nama_MK, Kode_Dosen, Nama_Dosen}\` *(Ketergantungan Parsial pada Kode_MK)*

Karena ada ketergantungan parsial (poin 2 dan 3), tabel harus dipecah menjadi **3 tabel 2NF**:

### Tabel 1: \`Mahasiswa\` (Primary Key: No_Mhs)
\`\`\`text
No_Mhs (PK) | Nama_Mhs | Jurusan
2683        | Welli    | MI
5432        | Bakri    | AK
\`\`\`

### Tabel 2: \`Mata_Kuliah_Raw\` (Primary Key: Kode_MK)
\`\`\`text
Kode_MK (PK) | Nama_MK              | Kode_Dosen | Nama_Dosen
MI350        | Manajemen Basis Data | B104       | Ati
MI465        | Analisis Prc. Sistem | B317       | Dita
AKN201       | Akuntansi Keuangan   | D310       | Lia
MKT300       | Dasar Pemasaran      | B212       | Lola
\`\`\`

### Tabel 3: \`KRS_Nilai\` (Composite PK: No_Mhs + Kode_MK)
\`\`\`text
No_Mhs (FK) | Kode_MK (FK) | Nilai
2683        | MI350        | A
2683        | MI465        | B
5432        | MI350        | C
5432        | AKN201       | B
5432        | MKT300       | A
\`\`\`

---

## 4. Tahap 3: Transformasi Menuju Bentuk Normal Ketiga (3NF)

Mari kita periksa Tabel \`Mata_Kuliah_Raw\`:
- \`Kode_MK -> Kode_Dosen\`
- \`Kode_Dosen -> Nama_Dosen\`

Di sini terdapat **Ketergantungan Transitif**: Atribut bukan kunci \`Nama_Dosen\` bergantung pada atribut bukan kunci \`Kode_Dosen\`. Jika satu dosen mengajar lebih dari 1 mata kuliah, nama dosen akan terduplikasi.

### Solusi 3NF:
Pecah \`Mata_Kuliah_Raw\` menjadi dua entitas terpisah:
1. **Tabel \`Mata_Kuliah\`**: \`{Kode_MK (PK), Nama_MK, Kode_Dosen (FK)}\`
2. **Tabel \`Dosen\`**: \`{Kode_Dosen (PK), Nama_Dosen}\`

---

## 5. Hasil Akhir Desain Database Relasional 3NF

Berikut adalah 4 tabel bersih hasil normalisasi siap pakai dalam implementasi SQL enterprise:

\`\`\`sql
-- 1. Master Mahasiswa
CREATE TABLE mahasiswa (
  no_mhs VARCHAR(20) PRIMARY KEY,
  nama_mhs VARCHAR(100) NOT NULL,
  jurusan VARCHAR(50) NOT NULL
);

-- 2. Master Dosen
CREATE TABLE dosen (
  kode_dosen VARCHAR(10) PRIMARY KEY,
  nama_dosen VARCHAR(100) NOT NULL
);

-- 3. Master Mata Kuliah
CREATE TABLE mata_kuliah (
  kode_mk VARCHAR(10) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  kode_dosen VARCHAR(10),
  FOREIGN KEY (kode_dosen) REFERENCES dosen(kode_dosen)
);

-- 4. Transaksi Nilai KRS
CREATE TABLE krs_nilai (
  no_mhs VARCHAR(20) NOT NULL,
  kode_mk VARCHAR(10) NOT NULL,
  nilai CHAR(2) NOT NULL,
  PRIMARY KEY (no_mhs, kode_mk),
  FOREIGN KEY (no_mhs) REFERENCES mahasiswa(no_mhs) ON DELETE CASCADE,
  FOREIGN KEY (kode_mk) REFERENCES mata_kuliah(kode_mk) ON DELETE RESTRICT
);
\`\`\`

> **Kesimpulan Arsitektur**:
> Dengan skema 3NF ini, database Anda kini **100% aman dari redudansi, bebas anomali insert, update, dan delete**, serta siap dihubungkan dengan ORM seperti Sequelize di Node.js.
`
};

async function seedBasisDataCourse() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // 1. Get tutor & category
    const tutor = await User.findOne({ where: { role: 'tutor' } });
    const tutorId = tutor ? tutor.id : 2;

    let category = await Category.findOne({ where: { slug: 'backend-cloud-architecture' } });
    if (!category) {
      category = await Category.findOne();
    }
    const categoryId = category ? category.id : 2;

    // 2. Find or create Course
    const courseTitle = 'Basis Data Lanjut: Arsitektur Skema & Normalisasi Relasional';
    const courseSlug = 'basis-data-lanjut-normalisasi-relasional';

    let course = await Course.findOne({ where: { slug: courseSlug } });
    if (!course) {
      course = await Course.create({
        tutor_id: tutorId,
        category_id: categoryId,
        title: courseTitle,
        slug: courseSlug,
        description: 'Panduan mendalam perancangan skema basis data relasional enterprise, reduksi redudansi, integrasi functional dependency, serta dekomposisi tabel dari UNF hingga 3NF dan BCNF berdasarkan studi kasus nyata industri.',
        thumbnail_url: '/uploads/courses/thumbnails/thumb_1790952970838_0f6a6bb44dae.webp',
        price: 0.00,
        level: 'intermediate',
        rating_avg: 4.95,
        rating_count: 88,
        status: 'published',
      });
      console.log(`✅ Created course: "${course.title}" (ID: ${course.id})`);
    } else {
      console.log(`ℹ️ Course already exists (ID: ${course.id})`);
    }

    // 3. Find or create Section 1
    let section1 = await CourseSection.findOne({
      where: { course_id: course.id, order_index: 1 }
    });
    if (!section1) {
      section1 = await CourseSection.create({
        course_id: course.id,
        title: 'Bab 1: Normalisasi Basis Data & Dekomposisi Skema Relasional',
        order_index: 1,
      });
      console.log(`✅ Created Section 1: "${section1.title}" (ID: ${section1.id})`);
    }

    // 4. Create or update Materials
    const materialsData = [
      {
        section_id: section1.id,
        title: '1.1 Fondasi Normalisasi Data, Tujuan & Mitigasi Tiga Anomali Database',
        content_type: 'book',
        file_url: '/uploads/materials/slides/normalisasi_data_pertemuan_1.ppt',
        duration_minutes: 20,
        is_preview: true,
        order_index: 1,
        content_text: materialsContent.materi1.trim(),
      },
      {
        section_id: section1.id,
        title: '1.2 Memahami Functional Dependency (Full, Partial, dan Transitive)',
        content_type: 'book',
        file_url: '/uploads/materials/slides/normalisasi_data_pertemuan_1.ppt',
        duration_minutes: 25,
        is_preview: true,
        order_index: 2,
        content_text: materialsContent.materi2.trim(),
      },
      {
        section_id: section1.id,
        title: '1.3 Tahapan Dekomposisi Normalisasi: Dari UNF, 1NF, 2NF, hingga 3NF & BCNF',
        content_type: 'book',
        file_url: '/uploads/materials/slides/normalisasi_data_pertemuan_1.ppt',
        duration_minutes: 30,
        is_preview: false,
        order_index: 3,
        content_text: materialsContent.materi3.trim(),
      },
      {
        section_id: section1.id,
        title: '1.4 Studi Kasus Riil: Dekomposisi KRS Mahasiswa & Manajemen Proyek',
        content_type: 'book',
        file_url: '/uploads/materials/slides/normalisasi_data_pertemuan_1.ppt',
        duration_minutes: 35,
        is_preview: false,
        order_index: 4,
        content_text: materialsContent.materi4.trim(),
      },
      {
        section_id: section1.id,
        title: '1.5 Slide Presentasi Kuliah: Normalisasi Data Pertemuan 1 (PPT Asli)',
        content_type: 'ppt',
        file_url: '/uploads/materials/slides/normalisasi_data_pertemuan_1.ppt',
        duration_minutes: 45,
        is_preview: true,
        order_index: 5,
        content_text: 'Berkas materi asli presentasi PowerPoint (.ppt) kuliah Basis Data: Normalisasi Data Pertemuan 1.',
      },
    ];

    for (const mat of materialsData) {
      let existingMat = await CourseMaterial.findOne({
        where: { section_id: section1.id, title: mat.title }
      });
      if (existingMat) {
        await existingMat.update(mat);
        console.log(`  ✔ Updated Material: "${mat.title}"`);
      } else {
        await CourseMaterial.create(mat);
        console.log(`  ✔ Created Material: "${mat.title}"`);
      }
    }

    console.log('🎉 Course "Basis Data Lanjut" successfully configured in SkillSphere AI!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding Basis Data course:', err);
    process.exit(1);
  }
}

seedBasisDataCourse();
