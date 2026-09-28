# Panduan Kerja AI Agent • SkillSphere AI

Dokumen ini adalah pedoman utama (**Ground Truth & Standards**) bagi seluruh AI Coding Agent yang bekerja di repositori **SkillSphere AI**. Seluruh instruksi, arsitektur backend, aturan bisnis finansial, sistem desain UI, dan alur kerja wajib dipatuhi secara konsisten tanpa pengecualian.

---

## 1. Ikhtisar Proyek & Arsitektur Sistem

SkillSphere AI adalah platform pembelajaran adaptif berbasis kecerdasan buatan (*AI-powered adaptive learning*) yang menghubungkan Siswa (*Student*), Instruktur Ahli (*Tutor*), dan Pengelola Platform (*Admin*).

### Tech Stack Utama
- **Runtime & Server**: Node.js, Express.js (MVC Pattern).
- **Database & ORM**: Sequelize ORM dengan MySQL (`skillsphere`) sebagai basis data utama dan SQLite sebagai *in-memory fallback* saat pengujian unit.
- **Caching & Akselerasi**: Redis (`ioredis`) dengan sistem *resilient memory-map fallback* + Gzip HTTP Response Compression (`compression` middleware).
- **Autentikasi & Keamanan**: JWT (*Access Token* 24 jam & *Refresh Token* 7 hari), Password Hashing `bcryptjs` (salt 10), Role-Based Access Control (RBAC), Helmet, dan CORS.
- **Media & File Processing**: `sharp` untuk kompresi otomatis sertifikat & thumbnail ke format WebP efisien, `multer` untuk multi-format course materials (`.mp4`, `.pdf`, `.pptx`, `.docx`, `.epub`), serta HTTP 206 Partial Content video streaming.
- **Email Service**: `nodemailer` (SMTP Gmail) untuk pengiriman 6-digit OTP verifikasi pendaftaran akun.
- **Frontend / Templating**: EJS (*Embedded JavaScript*), Vanilla CSS, dan Vanilla JavaScript (Clean Vanilla Architecture).

---

## 2. Aturan Bisnis & Logika Peran Akun (Role Rules)

### A. Pembagian Peran (RBAC)
1. **Siswa (`student`)**:
   - Mendaftar via `/register` dengan verifikasi OTP email 6-digit.
   - Wajib menyelesaikan 5 langkah onboarding personalisasi di `/dashboard/onboarding` sebelum mengakses katalog penuh.
   - Mengikuti kursus publik, memantau riwayat belajar adaptif, dan meraih sertifikat digital.
2. **Pengajar / Tutor (`tutor`)**:
   - Mendaftar sebagai calon tutor di `/register` (atau mengajukan via formulir pendaftaran).
   - Calon tutor diverifikasi oleh Administrator (berkas CV, portofolio, sertifikasi).
   - Setelah disetujui, akun di-upgrade ke status `tutor`, `TutorWallet` aktif otomatis, dan **bebas dari onboarding siswa** (langsung masuk ke `/dashboard` Studio Pengajar).
3. **Administrator (`admin`)**:
   - Akun admin hanya mengakses panel admin di `/admin` (jika membuka `/dashboard`, otomatis dialihkan ke `/admin`).
   - Header admin tidak memiliki tautan belajar siswa, hanya memuat identitas admin pill, theme toggle, breadcrumb adaptif, dan tombol logout.
   - Mengelola verifikasi pendaftaran tutor, validasi nomor sertifikat resmi, monitoring kursus, dan laporan finansial.

### B. Aturan Finansial & Bagi Hasil (20% / 80%)
- **20% Biaya Platform**: Dialokasikan untuk pemeliharaan server, token AI Gemini LLM API, dan operasional.
- **80% Pendapatan Bersih**: Masuk otomatis ke Virtual Wallet Tutor (`TutorWallet`).
- **Batas Penarikan Minimum (*Min Withdrawal*)**: **Rp 100.000**.
- **Masa Holding (*Holding Period*)**: **7 Hari** setelah transaksi kursus untuk mitigasi sengketa/refund.

---

## 3. Standar Desain UI / UX & Responsivitas Mobile

SkillSphere mengadopsi prinsip desain **Anthropic Claude Warm Paper Aesthetic** dengan standar kebersihan antislop.

### A. Palet Warna & Tipografi
- **Mode Terang (*Light Mode*)**: Background warm paper `#FAF9F5`, border subtil `#E5E4DE`, surface `#FFFFFF`.
- **Mode Gelap (*Dark Mode*)**: Background deep obsidian `#141413`, border `#2A2926`, surface `#1F1E1B`.
- **Tipografi**:
  - Judul / Editorial: `Newsreader` (Editorial Serif).
  - Teks / UI: `Plus Jakarta Sans` (Modern Geometric Sans).
  - Kode / Monospace: `JetBrains Mono` / `SF Mono`.
- **Pewarnaan Semantic**: Hijau Sukses `#10B981`, Merah Bahaya `#EF4444`, Kuning Peringatan `#F59E0B`.

### B. Standar Mobile-First & Responsif
- **Header**:
  - Di layar $\le 860\text{px}$, navigasi desktop beralih menjadi *horizontal scrollable swipeable tabs*.
  - Tombol tema dan logout disederhanakan menjadi tombol ikon bulat (*compact icon pills*) tanpa teks panjang yang memakan ruang.
- **Grid Layout**: Dua kolom dashboard otomatis reflow menjadi 1 kolom vertikal proporsional pada layar tablet dan ponsel.
- **Modal Dokumen Hukum**: Modal Syarat & Privasi wajib berukuran `width: 96%`, `max-height: 88vh`, dengan *scroll-to-bottom progress bar* dan tombol *"Saya Mengerti & Setujui"* yang aktif saat dibaca hingga bawah ($\ge 95\%$).
- **Zero Horizontal Overflow**: Tidak boleh ada tabel, elemen, atau teks yang menyebabkan layar ponsel bergeser horizontal secara tidak sengaja.

### C. Kaidah Anti-Slop (Kualitas Visual & Salinan)
- **Dilarang menggunakan tanda em dash (`—`)** dalam teks antarmuka atau balasan pesan. Gunakan tanda hubung biasa (`-`) atau titik dua (`:`).
- **Kontras Warna**: Seluruh teks harus memenuhi standar kontras minimum WCAG AA (rasio $\ge 4.5:1$).
- **Data Nyata**: Jangan menggunakan teks *lorem ipsum* sembarangan. Gunakan copy kontekstual pendidikan teknologi Indonesia.

---

## 4. Standar Kode & Konvensi Teknis

### A. Backend & API
- **Struktur Response Standar**:
  ```json
  {
    "success": true,
    "message": "Pesan deskriptif dalam Bahasa Indonesia.",
    "data": { ... }
  }
  ```
- **Error Handling**: Setiap error controller harus mengembalikan HTTP status yang sesuai (400, 401, 403, 404, 409, 500) dengan `success: false`.
- **Redis & Caching**:
  - Gunakan `cacheMiddleware(ttlSeconds)` pada GET route publik berbeban tinggi (`/api/courses`, `/api/courses/categories`).
  - Pasang `invalidateCacheMiddleware(['cache:/api/courses*', 'cache:/api/admin*'])` pada route mutasi (POST, PUT, DELETE).
- **Pembersihan Berkas**: Saat menghapus materi kursus atau thumbnail, berkas terkait di direktori `public/uploads/` wajib dihapus dari disk secara aman untuk mencegah penumpukan sampah storage (*orphaned files*).

### B. Frontend JavaScript & EJS
- Gunakan `escapeHtml(str)` untuk semua nilai dinamis yang dirender ke innerHTML guna mencegah celah keamanan XSS (*Cross-Site Scripting*).
- Sebelum memanggil `.filter()` atau `.map()`, pastikan tipe data adalah *array* dengan fallback aman:
  ```javascript
  const list = (json.data && Array.isArray(json.data.items)) ? json.data.items : (Array.isArray(json.data) ? json.data : []);
  ```

---

## 5. Pengujian (*Testing*) & Verifikasi Mutu

Sebelum menyelesaikan tugas atau menyerahkan hasil kerja ke pengguna, AI Agent **wajib menjalankan pengujian otomatis** untuk memastikan tidak ada *regression error*:

```bash
# Menjalankan seluruh test suite
npm test
```

### Checklist Pengujian Wajib
1. **Database Relations**: `tests/db.test.js` (19 relasi tabel Sequelize MySQL).
2. **Autentikasi & OTP**: `tests/auth.test.js` (JWT, bcrypt, RBAC, dan SMTP OTP).
3. **WebP Image Processing**: `tests/imageHelper.test.js` (Konversi dan kompresi Sharp).
4. **Media Storage & Streaming**: `tests/mediaStorage.test.js` (Multi-format storage & HTTP 206 partial streaming).
5. **Admin Verification**: `tests/adminVerification.test.js` (Approval/reject aplikasi tutor dan verifikasi sertifikat).
6. **Tutor Curriculum Portal**: `tests/tutorMaterialsPortal.test.js` (Manajemen section, materi, reordering, dan disk purge).
7. **Redis Caching & Gzip**: `tests/redisCompression.test.js` (Cache HIT/MISS, Gzip encoding verification).
8. **Kompilasi EJS**: Seluruh file view di `views/` harus lolos uji `ejs.compile` tanpa syntax error.

---

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->
