# Dokumentasi Teknis Pengembangan — Sprint 1 & Sprint 2
**Platform Pembelajaran Online Berbasis AI & Multi-Vendor — SkillSphere AI**

---

### Profil Pengembang
- **Nama**: Akhmad Satrio Cahyo Pratama
- **NRP**: 3125522013
- **Peran**: Frontend Engineer (Tutor & Admin Portal) + QA/Docs
- **Tim**: CodeCrafters Team 01

---

## 1. Ringkasan Tugas & Tanggung Jawab

Berdasarkan *Sprint Responsibility Matrix* perancangan sistem SkillSphere AI:
1. **Sprint 1 (Foundation & Security)**:
   - **Tanggung Jawab**: **Admin Verification UI**
   - **Deliverable**: Panel antarmuka verifikasi calon tutor, peninjauan berkas pendaftaran (CV, portfolio, LinkedIn), serta validasi keaslian sertifikasi pengajar dari instansi resmi.
2. **Sprint 2 (Content Delivery & AI Integration)**:
   - **Tanggung Jawab**: **Material Upload Portal**
   - **Deliverable**: Portal manajemen kurikulum bagi tutor, antarmuka pengunggahan materi multi-format (Video MP4, PPT/PPTX, PDF, DOC/DOCX, Digital Book ePUB), kompresi otomatis thumbnail ke format modern WebP, fitur drag-and-drop, penyusunan ulang urutan materi (*reordering*), serta pemutar/pratinjau materi (*live media player/viewer*).
3. **Quality Assurance & Testing**:
   - Pembuatan skenario pengujian E2E dan API unit test untuk seluruh alur verifikasi admin dan manajemen materi tutor (`tests/adminVerification.test.js` dan `tests/tutorMaterialsPortal.test.js`).

---

## 2. Implementasi Sprint 1: Admin Verification UI

### A. Fitur & Antarmuka (`views/admin/verification.ejs`)
- **Desain Claude.ai Minimalist Aesthetic**:
  - Menggunakan palet warm paper `#FBF9F5` / `#18181B`, tipografi serif editorial *Newsreader* dan *Plus Jakarta Sans*, aksen monokrom kontras tinggi, serta kartu informasi elegan.
- **Kartu Metrik Real-time**:
  - Total Pengajuan Tutor
  - Menunggu Review (Pending Review)
  - Tutor Disetujui (Approved)
  - Sertifikasi Tervalidasi Resmi (Verified Certifications)
- **Tab Navigasi Interaktif**:
  - **Tab 1: Pendaftaran Calon Tutor (`tutor_applications`)**: Menampilkan daftar pelamar, asal instansi, tahun pengalaman, tautan CV, LinkedIn, dan portofolio.
  - **Tab 2: Validasi Sertifikat Pengajar (`tutor_certifications`)**: Menampilkan sertifikat kompetensi, lembaga penerbit, ID kredensial, dan tautan pembuktian.
- **Aksi Verifikasi & Modal**:
  - **Modal Detail Pengajuan**: Meninjau detail profil, kontak, bio, CV, dan riwayat sertifikat.
  - **Aksi Setujui (Approve)**: Mengubah status menjadi `approved`, meng-upgrade role user dari `student` menjadi `tutor`, dan otomatis mengaktifkan `TutorWallet`.
  - **Aksi Tolak (Reject)**: Menampilkan modal input alasan penolakan (`rejection_reason`) agar transparan bagi pelamar.
  - **Aksi Validasi Sertifikat**: Memberikan tanda resmi (*Official Verified Badge*) pada sertifikat tutor.
- **Pencarian Realtime & Filter**:
  - Filter status: *Semua*, *Menunggu*, *Disetujui*, *Ditolak*.
  - Live search debounced berdasarkan nama, email, atau instansi.

### B. Arsitektur Backend API Admin
| Method | Endpoint | Hak Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Admin | Statistik agregasi pengajuan dan sertifikasi |
| `GET` | `/api/admin/tutor-applications` | Admin | Daftar pendaftaran calon tutor (dengan search & filter) |
| `GET` | `/api/admin/tutor-applications/:id` | Admin | Detail pendaftaran calon tutor |
| `PUT` | `/api/admin/tutor-applications/:id/approve` | Admin | Menyetujui pendaftaran tutor & mengaktifkan dompet |
| `PUT` | `/api/admin/tutor-applications/:id/reject` | Admin | Menolak pendaftaran dengan alasan |
| `GET` | `/api/admin/tutor-certifications` | Admin | Daftar sertifikasi pengajar |
| `PUT` | `/api/admin/tutor-certifications/:id/verify` | Admin | Memvalidasi keaslian sertifikat |
| `PUT` | `/api/admin/tutor-certifications/:id/unverify` | Admin | Membatalkan status verifikasi sertifikat |

---

## 3. Implementasi Sprint 2: Material Upload Portal

### A. Fitur & Antarmuka (`views/tutor/materials.ejs`)
- **Course Selector & Banner Header**:
  - Dropdown pemilih kursus yang diajar oleh tutor.
  - Banner kursus dengan informasi kategori, level, harga, total bab, total materi, dan estimasi total durasi pembelajaran.
- **Pengubah Sampul Kursus (Sharp WebP Converter)**:
  - Mengunggah thumbnail kursus dengan kompresi otomatis ke WebP di sisi server (menghemat ukuran 85%–92% tanpa mengurangi ketajaman).
- **Manajemen Struktur Bab (Curriculum Sections)**:
  - Tombol modal pembuatan bab/modul baru (`CourseSection`).
  - Hapus bab berserta seluruh materi di dalamnya secara berantai (*cascade*).
- **Multi-Format Material Drag & Drop Uploader**:
  - Mendukung format:
    1. **Video Pembelajaran**: `.mp4`, `.webm`, `.mkv`
    2. **Slide Presentasi**: `.ppt`, `.pptx`
    3. **Dokumen Materi**: `.pdf`
    4. **Modul Panduan**: `.doc`, `.docx`
    5. **Buku Digital / E-Book**: `.epub`
  - Auto-deteksi tipe file saat berkas ditaruh ke drop zone.
  - Indikator ukuran file dan bilah progres upload persentase (*progress bar*).
  - Form input: Judul Materi, Estimasi Durasi (Menit), dan Toggle **Gratis Preview** (`is_preview`).
- **Penyusunan Ulang Urutan Materi (*Reordering*)**:
  - Tombol *Move Up* / *Move Down* untuk menukar urutan materi secara real-time via API `PATCH /api/materials/reorder`.
- **Pemutar & Penampil Media Terintegrasi (*Live Media Player*)**:
  - Pemutar video HTML5 dengan *HTTP Range Streaming (206 Partial Content)*.
  - *Embedded PDF Viewer* untuk membaca dokumen modul langsung di dalam modal.
  - Kartu unduh dan pratinjau untuk slide PPT, dokumen Word, dan buku digital.
- **Pembersihan Berkas Otomatis**:
  - Saat materi dihapus, file biner di direktori `public/uploads/` otomatis dibersihkan dari penyimpanan disk.

### B. Arsitektur Backend API Kursus & Materi
| Method | Endpoint | Hak Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/courses/tutor/my-courses` | Tutor, Admin | Mengambil seluruh kursus milik tutor login |
| `GET` | `/api/courses/:id` | Publik / Auth | Mengambil detail kursus lengkap dengan struktur bab & materi |
| `POST` | `/api/courses` | Tutor, Admin | Membuat kursus baru |
| `PUT` | `/api/courses/:id` | Tutor, Admin | Memperbarui info/sampul WebP kursus |
| `POST` | `/api/courses/:id/sections` | Tutor, Admin | Membuat bab kurikulum baru |
| `DELETE` | `/api/courses/sections/:id` | Tutor, Admin | Menghapus bab kurikulum |
| `POST` | `/api/materials` | Tutor, Admin | Mengunggah materi multi-format dengan Multer |
| `PATCH` | `/api/materials/reorder` | Tutor, Admin | Mengubah susunan indeks urutan materi |
| `DELETE` | `/api/materials/:id` | Tutor, Admin | Menghapus materi dan menghapus file dari disk |

---

## 4. Hasil Pengujian Unit & End-to-End (QA Test Suite)

Semua skenario pengujian telah diintegrasikan pada perintah `npm test` dan berhasil lulus **100% PASS**:

```bash
> npm test

✔ Table [users] defined correctly as Model <User>
...
✔ Table [withdrawal_requests] defined correctly as Model <WithdrawalRequest>
🎉 ALL 19 DATABASE RELATIONAL TESTS PASSED SUCCESSFULLY!

✔ Student OTP email verification succeeded & JWT tokens issued.
✔ Tutor OTP email verification succeeded & TutorWallet active.
✔ RBAC: Student authorized / blocked from tutor endpoint (403).
🎉 ALL AUTH & OTP EMAIL TESTS PASSED SUCCESSFULLY!

✔ Buffer successfully converted & compressed to WebP (saved 91.4%).
🎉 ALL IMAGE HELPER & WEBP TESTS PASSED SUCCESSFULLY!

✔ Video upload handled: /uploads/materials/videos/...
✔ HTTP 206 Partial Content video streaming verified.
✔ Access control: Unenrolled student cannot access locked material file_url.
🎉 ALL MEDIA STORAGE & SPRINT 2 TESTS PASSED SUCCESSFULLY!

✔ RBAC Security: Non-admin student blocked from admin endpoints (403).
✔ Admin Stats API verified (Total, Pending, Approved, Verified metrics).
✔ PUT /api/admin/tutor-applications/:id/approve: Upgraded role & activated TutorWallet.
✔ PUT /api/admin/tutor-applications/:id/reject recorded rejection reason successfully.
✔ PUT /api/admin/tutor-certifications/:id/verify: Verified teacher official certification.
🎉 ALL ADMIN VERIFICATION TESTS PASSED (SPRINT 1 - SATRIO)!

✔ POST /api/courses: Created course with initial default section.
✔ POST /api/materials: Uploaded video material.
✔ POST /api/materials: Uploaded PPT presentation.
✔ PATCH /api/materials/reorder: Reordered materials successfully.
✔ DELETE /api/materials/:id: Deleted material and purged storage.
🎉 ALL TUTOR MATERIALS PORTAL TESTS PASSED (SPRINT 2 - SATRIO)!
```

---

## 5. Rangkuman URL & Halaman

| Halaman | URL Web | Hak Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Admin Verification UI** | `/admin/verification` | `admin` | Portal review pendaftaran tutor & validasi sertifikat |
| **Material Upload Portal** | `/tutor/materials` | `tutor`, `admin` | Portal upload multi-format materi & susun bab |
| **Dashboard Utama** | `/dashboard` | Semua Role | Beranda ringkasan sistem, kartu metrik, dan navigasi cepat |
| **Login / Register** | `/login`, `/register` | Publik | Otentikasi JWT dengan Claude UI |
