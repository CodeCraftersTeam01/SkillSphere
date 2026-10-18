const html5Articles = {
  // BAB 1: Pondasi Dasar & Struktur Dokumen
  '1.1 Anatomi Dokumen HTML5 & Konfigurasi Lingkungan Belajar': `
## 1. Pengantar Fundamental: Apa Itu HTML?
**HTML (HyperText Markup Language)** adalah bahasa markup standar global yang menjadi fondasi struktural seluruh halaman web di dunia. Diciptakan pertama kali oleh **Tim Berners-Lee** di laboratorium CERN pada tahun 1989, HTML telah berkembang dari format dokumen ilmiah sederhana menjadi platform aplikasi modern melalui spesifikasi **HTML5 Living Standard** yang dikelola oleh WHATWG dan W3C.

Dalam arsitektur *The Web Trinity*, HTML bertindak sebagai penyusun struktur data dan semantik, CSS sebagai penata estetika dan layout visual, sedangkan JavaScript sebagai penggerak interaksi dinamis dan logika komputasi.

## 2. Alur Eksekusi Browser: Critical Rendering Path (CRP)
Ketika browser menerima file HTML, terjadi serangkaian tahapan komputasi berkecepatan tinggi:
1. **Konversi Bytes ke Karakter**: Aliran byte data diubah menjadi karakter berdasarkan encoding UTF-8.
2. **Tokenisasi (Tokenization)**: Karakter dipecah menjadi token pembuka, penutup, dan isi data.
3. **Konstruksi DOM Tree**: Token disusun menjadi struktur pohon objek Node di memori browser.
4. **CSSOM & Render Tree**: Struktur DOM digabungkan dengan CSS Object Model untuk membentuk pohon render elemen kasat mata.
5. **Layout (Reflow) & Paint**: Peramban menghitung koordinat piksel dan menggambar antarmuka ke layar.

## 3. Bedah Anatomi Dokumen Standar Industri
Berikut adalah struktur dasar dokumen HTML5 yang memenuhi standar industri:

\`\`\`html
<!DOCTYPE html>
<html lang="id" dir="ltr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkillSphere AI - Ruang Belajar Modern</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  </head>
  <body>
    <header role="banner">
      <nav aria-label="Navigasi Utama">
        <a href="/">Beranda</a>
        <a href="/courses">Katalog Kursus</a>
      </nav>
    </header>
    <main role="main">
      <article>
        <h1>Anatomi Dokumen HTML5</h1>
        <p>Struktur dokumen bersih, modular, dan ramah mesin pencari.</p>
      </article>
    </main>
    <footer role="contentinfo">
      <p>&copy; 2026 SkillSphere AI. Hak Cipta Dilindungi.</p>
    </footer>
  </body>
</html>
\`\`\`

> **Poin Kunci:** Deklarasi \`<!DOCTYPE html>\` di awal dokumen wajib dituliskan agar peramban beroperasi dalam **Standards Mode** dan terhindar dari mode lawas **Quirks Mode**.
`,

  '1.2 Hirarki Teks, Tipografi & Format Konten': `
## 1. Konsep Hierarki Tipografi Web
Hierarki tipografi mengatur tingkat kepentingan informasi sehingga pembaca dan mesin perayap dapat memindai dokumen dengan efisien. 

### Aturan Utama Heading (\`<h1>\` hingga \`<h6>\`)
- **\`<h1>\`**: Judul utama dokumen. **Hanya boleh ada 1 tag \`<h1>\` per halaman** untuk menjaga integritas SEO.
- **\`<h2>\`**: Sub-judul bab atau bagian topik utama.
- **\`<h3>\` - \`<h6>\`**: Sub-bagian hierarkis di bawahnya secara berurutan tanpa melompati tingkatan.

## 2. Elemen Frase Semantik vs Gaya Visual Murni
Di era HTML5, pemilihan tag didasarkan pada makna informasinya:
- **\`<strong>\`** vs \`<b>\`: \`<strong>\` memberikan makna urgensi/kepentingan tinggi bagi screen reader, sedangkan \`<b>\` hanya menebalkan huruf visual.
- **\`<em>\`** vs \`<i>\`: \`<em>\` menekankan intonasi nada baca, sedangkan \`<i>\` digunakan untuk istilah teknis atau bahasa asing.
- **\`<mark>\`**: Menyoroti teks konteks hasil pencarian.
- **\`<abbr title="...">\`**: Menjelaskan kepanjangan dari sebuah singkatan.
- **\`<time datetime="YYYY-MM-DD">\`**: Menyajikan format waktu yang dapat dipahami oleh mesin kalender dan search bot.

\`\`\`html
<article>
  <h2>Evolusi Arsitektur Web</h2>
  <p>
    Dipublikasikan pada <time datetime="2026-10-09">9 Oktober 2026</time> oleh <strong>SkillSphere Editorial</strong>.
  </p>
  <p>
    Spesifikasi modern dikembangkan oleh konsorsium <abbr title="World Wide Web Consortium">W3C</abbr> untuk menjamin standar terbuka.
  </p>
</article>
\`\`\`
`,

  '1.3 Tautan Hiperteks, Navigasi & Anchor Positioning': `
## 1. Kekuatan Tautan Hiperteks (\`<a>\`)
Tautan adalah elemen fundamental yang menghubungkan dokumen di seluruh jaringan web global. Elemen \`<a>\` menggunakan atribut utama \`href\` (*Hypertext Reference*).

## 2. Keamanan Tautan Eksternal: Mencegah Serangan Tabnabbing
Saat membuka tautan ke situs luar menggunakan \`target="_blank"\`, peramban secara bawaan mengizinkan halaman baru mengakses objek \`window.opener\`. Untuk mencegah eksploitasi pengalihan phishing (*Reverse Tabnabbing*), wajib menyertakan:
\`\`\`html
<a href="https://w3.org" target="_blank" rel="noopener noreferrer">Konsorsium W3C</a>
\`\`\`

## 3. Navigasi Internal & Posisi Anchor
Tautan internal memungkinkan pengguna berpindah ke bagian tertentu dalam halaman yang sama menggunakan tanda pagar (\`#id\`):
\`\`\`html
<!-- Tautan Navigasi -->
<a href="#kurikulum">Lihat Silabus Kurikulum</a>

<!-- Target Bagian -->
<section id="kurikulum">
  <h2>Silabus Kurikulum Adaptif</h2>
</section>
\`\`\`

### Protokol Tautan Khusus
- **Email**: \`<a href="mailto:support@skillsphere.id">Hubungi Tim Bantuan</a>\`
- **Telepon**: \`<a href="tel:+628123456789">Layanan Darurat</a>\`
- **Unduhan Berkas**: \`<a href="/files/silabus.pdf" download>Unduh Silabus</a>\`
`,

  '1.4 Penyusunan Daftar (List) & Struktur Informasi Bersarang': `
## 1. Tiga Variasi Daftar dalam HTML5
Pengorganisasian data bertingkat diimplementasikan menggunakan 3 jenis list semantik:

1. **Unordered List (\`<ul>\`)**: Kumpulan butir data tanpa urutan numerik (menggunakan peluru/bullet).
2. **Ordered List (\`<ol>\`)**: Kumpulan instruksi atau peringkat terurut (1, 2, 3 atau A, B, C) dengan atribut pendukung \`start\`, \`reversed\`, dan \`type\`.
3. **Description List (\`<dl>\`)**: Pasangan istilah (\`<dt>\`) dan deskripsi penjelasnya (\`<dd>\`). Sangat ideal untuk kamus istilah, glosarium, atau metadata artikel.

## 2. Struktur Menu Navigasi Bersarang (Nested Breadcrumbs)
\`\`\`html
<nav aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li><a href="/">Beranda</a></li>
    <li><a href="/courses">Frontend</a></li>
    <li aria-current="page">HTML5 Expert</li>
  </ol>
</nav>

<dl>
  <dt>DOM (Document Object Model)</dt>
  <dd>Representasi pohon objek dari dokumen HTML yang dapat dimanipulasi via JavaScript.</dd>
  <dt>Semantic HTML</dt>
  <dd>Penggunaan tag markup yang merefleksikan makna dan peran konten.</dd>
</dl>
\`\`\`
`,

  '1.5 Integrasi Media Dasar: Gambar, Audio, dan Video': `
## 1. Elemen Gambar (\`<img>\`) & Pencegahan Layout Shift
Menyematkan gambar yang optimal membutuhkan atribut esensial:
- **\`src\`**: Alamat sumber berkas gambar.
- **\`alt\`**: Teks deskriptif pengganti untuk aksesibilitas pembaca layar dan saat koneksi lambat.
- **\`width\` & \`height\` eksplisit**: Mengalokasikan ruang di layar sebelum gambar selesai diunduh untuk mencegah **CLS (Cumulative Layout Shift)**.
- **\`loading="lazy"\` & \`decoding="async"\`**: Mengoptimalkan performa loading awal halaman.

## 2. Wadah Semantik \`<figure>\` & \`<figcaption>\`
\`\`\`html
<figure>
  <img src="/images/architecture.webp" alt="Diagram arsitektur sistem SkillSphere" width="800" height="450" loading="lazy">
  <figcaption>Gambar 1.1: Arsitektur sistem adaptif berbasis microservices dan AI.</figcaption>
</figure>
\`\`\`

## 3. Pemutar Audio & Video Native HTML5
\`\`\`html
<video controls preload="metadata" poster="/images/poster.jpg">
  <source src="/videos/tutorial.mp4" type="video/mp4">
  <source src="/videos/tutorial.webm" type="video/webm">
  <track src="/subtitles/id.vtt" kind="subtitles" srclang="id" label="Bahasa Indonesia">
  Browser Anda tidak mendukung tag pemutar video.
</video>
\`\`\`
`,

  // BAB 2: Semantik Web, Formulir Interaktif & Validasi
  '2.1 Struktur Semantik Modern: Layout Tanpa div Soup': `
## 1. Mengapa Semantik Web Menjadi Standar Mutlak Industri?
Sebelum kehadiran HTML5, halaman web kerap didominasi oleh ratusan tag \`<div class="...">\` yang tidak bermakna bagi mesin perayap. HTML5 menghadirkan elemen tata letak semantik yang memberikan informasi struktural langsung:

- **\`<header>\`**: Pengantar halaman atau wadah logo dan navigasi pembuka.
- **\`<nav>\`**: Kumpulan tautan navigasi penting.
- **\`<main>\`**: Area konten unik utama.
- **\`<article>\`**: Blok konten independen yang dapat disindikasi ulang (artikel, kartu modul, ulasan pengguna).
- **\`<section>\`**: Pengelompokan tematik yang memiliki heading tersendiri.
- **\`<aside>\`**: Konten pelengkap yang terpisah dari alur utama (sidebar, daftar artikel terkait).
- **\`<footer>\`**: Catatan kaki, hak cipta, dan informasi legalitas.

## 2. Kapan Memilih \`<article>\` vs \`<section>\`?
> **Panduan Mudah:** Jika konten tersebut masuk akal jika dibaca secara mandiri di RSS feed atau platform lain, gunakan \`<article>\`. Jika konten tersebut hanyalah potongan sub-bagian dalam dokumen, gunakan \`<section>\`.
`,

  '2.2 Formulir Interaktif & Variasi Input Modern': `
## 1. Anatomi Elemen Formulir (\`<form>\`)
Elemen formulir adalah gerbang interaksi dua arah antara pengguna dan server.
- \`action\`: Endpoint URL tujuan pengiriman data.
- \`method\`: Metode HTTP pengiriman (\`POST\` untuk data rahasia/mutasi, \`GET\` untuk query pencarian).
- \`enctype\`: \`multipart/form-data\` wajib digunakan saat mengunggah berkas media.

## 2. Variasi Tipe Input Modern HTML5
HTML5 mengeliminasi kebutuhan plugin pihak ketiga dengan menghadirkan tipe input cerdas:
- \`type="email"\`: Memvalidasi format alamat email dan memicu tombol \`@\` pada keyboard ponsel.
- \`type="tel"\`: Membuka keypad numerik telepon di perangkat sentuh.
- \`type="date"\` / \`type="time"\`: Memunculkan kalender dan jam native OS.
- \`type="range"\`: Slider interaktif untuk memilih rentang nilai.
- \`type="color"\`: Color picker native peramban.

\`\`\`html
<form action="/api/profile" method="POST">
  <fieldset>
    <legend>Preferensi Akun Pembelajar</legend>
    <label for="user-dob">Tanggal Lahir:</label>
    <input type="date" id="user-dob" name="dob" required>
    
    <label for="study-hours">Target Belajar Mingguan (Jam):</label>
    <input type="range" id="study-hours" name="hours" min="1" max="40" value="10">
  </fieldset>
</form>
\`\`\`
`,

  '2.3 Kontrol Pilihan: Select, Datalist, Radio, dan Checkbox': `
## 1. Pilihan Dropdown Terstruktur (\`<select>\` & \`<optgroup>\`)
Untuk opsi pilihan berjumlah sedang, gunakan \`<select>\` dengan pengelompokan tematik melalui \`<optgroup>\`:
\`\`\`html
<label for="category-select">Pilih Bidang Keahlian:</label>
<select id="category-select" name="category">
  <optgroup label="Pengembangan Perangkat Lunak">
    <option value="frontend">Frontend Engineering</option>
    <option value="backend">Backend Architecture</option>
  </optgroup>
  <optgroup label="Kecerdasan Buatan">
    <option value="ai-ml">Machine Learning & LLM</option>
  </optgroup>
</select>
\`\`\`

## 2. Pencarian Auto-Complete Native dengan \`<datalist>\`
Elemen \`<datalist>\` memberikan rekomendasi instan saat pengguna mengetik, namun tetap mengizinkan masukan nilai kustom bebas tanpa kode JavaScript eksternal:
\`\`\`html
<label for="city-input">Kota Domisili:</label>
<input list="indonesia-cities" id="city-input" name="city" placeholder="Ketik nama kota...">
<datalist id="indonesia-cities">
  <option value="Jakarta">
  <option value="Bandung">
  <option value="Surabaya">
  <option value="Yogyakarta">
</datalist>
\`\`\`
`,

  '2.4 Validasi Formulir Native & Aksesibilitas Form': `
## 1. Constraint Validation API Native
Peramban modern menyediakan mesin validasi bawaan yang dapat dikontrol sepenuhnya lewat atribut markup:
- \`required\`: Mencegah form dikirim jika kolom kosong.
- \`pattern="[0-9]{6}"\`: Memvalidasi pola masukan ekspresi reguler (misal: kode OTP 6-angka).
- \`minlength\` & \`maxlength\`: Menentukan batas minimal dan maksimal jumlah karakter.
- \`min\` & \`max\`: Menentukan rentang angka valid.

## 2. Pseudo-Class CSS untuk Status Validasi
\`\`\`css
input:focus-visible {
  outline: 2px solid var(--accent-primary);
}
input:user-invalid {
  border-color: #EF4444;
}
input:user-valid {
  border-color: #10B981;
}
\`\`\`

## 3. Aksesibilitas Form: Menghubungkan Pesan Error
Gunakan atribut \`aria-describedby\` dan \`aria-invalid\` untuk memberi tahu pengguna pembaca layar ketika terjadi kesalahan pengisian kolom.
`,

  '2.5 Tabel Data Terstruktur & Responsif': `
## 1. Anatomi Lengkap Elemen Tabel
Tabel data yang aksesibel wajib menyusun hierarki data menggunakan komponen semantik:
- **\`<table>\`**: Kontainer induk tabel data.
- **\`<caption>\`**: Judul deskriptif tabel yang dibaca pertama kali oleh pembaca layar.
- **\`<thead>\`**, **\`<tbody>\`**, **\`<tfoot>\`**: Pembagian zona kepala, badan data, dan kaki rekapitulasi.
- **\`<th scope="col">\` & \`<th scope="row">\`**: Menegaskan apakah sel header mengontrol kolom vertikal atau baris horizontal.

\`\`\`html
<div class="table-responsive-wrapper">
  <table>
    <caption>Daftar Modul & Alokasi Waktu Belajar</caption>
    <thead>
      <tr>
        <th scope="col">Bab</th>
        <th scope="col">Topik Pembahasan</th>
        <th scope="col">Durasi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Bab 1</th>
        <td>Pondasi Dasar & Struktur Dokumen</td>
        <td>75 Menit</td>
      </tr>
      <tr>
        <th scope="row">Bab 2</th>
        <td>Semantik Web & Validasi Formulir</td>
        <td>90 Menit</td>
      </tr>
    </tbody>
  </table>
</div>
\`\`\`
`,

  // BAB 3: Aksesibilitas (a11y), Grafis Modern & Media Adaptif
  '3.1 Prinsip Aksesibilitas Web (WCAG 2.2) & WAI-ARIA': `
## 1. Empat Pilar Utama WCAG (POUR)
Aksesibilitas web menjamin seluruh orang dapat mengakses aplikasi secara adil:
1. **Perceivable**: Konten dapat ditangkap oleh indera manusia (kontras warna >= 4.5:1, teks alternatif gambar).
2. **Operable**: Semua fungsi dapat dioperasikan penuh melalui tombol keyboard Tab dan Enter.
3. **Understandable**: Antarmuka mudah dipahami dengan pesan galat yang jelas.
4. **Robust**: Kode kompatibel dengan ragam teknologi asistif modern.

## 2. Atribut WAI-ARIA yang Paling Sering Digunakan di Industri
- \`aria-label\`: Memberikan label suara pada tombol yang hanya memuat ikon grafis.
- \`aria-expanded="true|false"\`: Menandai status buka/tutup menu akordeon atau dropdown.
- \`aria-hidden="true"\`: Menyembunyikan elemen dekoratif agar tidak membingungkan screen reader.
- \`role="region"\` / \`role="status"\`: Mengumumkan pembaruan pesan dinamis kepada pengguna tunanetra.
`,

  '3.2 Media Adaptif & Responsive Images (picture & srcset)': `
## 1. Tantangan Fragmentasi Layar & Resolusi Retina
Menyajikan gambar berukuran besar di smartphone menghabiskan kuota data, sedangkan menyajikan gambar kecil di layar 4K terlihat pecah. Solusinya adalah teknik **Art Direction & Resolution Switching**.

## 2. Implementasi Elemen \`<picture>\` dengan Multi-Format
\`\`\`html
<picture>
  <!-- Layar Komputer Lebar: Format Generasi Baru AVIF -->
  <source media="(min-width: 1024px)" srcset="/images/banner-large.avif" type="image/avif">
  
  <!-- Layar Tablet: Format WebP -->
  <source media="(min-width: 640px)" srcset="/images/banner-medium.webp" type="image/webp">
  
  <!-- Fallback Default Mobile -->
  <img src="/images/banner-mobile.jpg" alt="Ilustrasi mahasiswa belajar adaptif" width="600" height="338" loading="lazy" decoding="async">
</picture>
\`\`\`
`,

  '3.3 Grafik Vektor Interaktif (SVG) Inline & Manipulasi DOM': `
## 1. Mengapa SVG (Scalable Vector Graphics) Superior?
Berbeda dengan format raster (PNG/JPEG) yang berbasis piksel, SVG berbasis persamaan matematika XML sehingga:
- Berukuran sangat kecil (hanya beberapa kilobyte).
- Tidak pernah pecah atau buram pada resolusi layar berapa pun.
- Dapat diwarnai, dianimasikan, dan dimanipulasi secara dinamis via CSS dan JavaScript DOM.

\`\`\`html
<svg viewBox="0 0 100 100" width="80" height="80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ikon Centang Berhasil">
  <circle cx="50" cy="50" r="45" fill="#10B981" opacity="0.2" stroke="#10B981" stroke-width="4"/>
  <path d="M30 50 L45 65 L70 35" fill="none" stroke="#10B981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
\`\`\`
`,

  '3.4 Dasar HTML5 Canvas untuk Render Grafis 2D': `
## 1. Canvas (Immediate Mode) vs SVG (Retained Mode)
Elemen \`<canvas>\` menyediakan kanvas bitmap kosong yang dapat digambar secara real-time menggunakan JavaScript API. Sangat cocok untuk visualisasi data interaktif, pengolahan filter citra, dan game 2D.

\`\`\`html
<canvas id="chart-canvas" width="400" height="200"></canvas>

<script>
  const canvas = document.getElementById('chart-canvas');
  const ctx = canvas.getContext('2d');
  
  // Menggambar latar diagram
  ctx.fillStyle = '#1F1E1B';
  ctx.fillRect(0, 0, 400, 200);
  
  // Menggambar bar statistik
  ctx.fillStyle = '#10B981';
  ctx.fillRect(40, 60, 50, 100);
  ctx.fillRect(120, 30, 50, 130);
  ctx.fillRect(200, 80, 50, 80);
</script>
\`\`\`
`,

  '3.5 Elemen Interaktif Modern: dialog, details, dan summary': `
## 1. Modal Pop-Up Native dengan Elemen \`<dialog>\`
Elemen \`<dialog>\` menghadirkan jendela dialog native yang secara otomatis menangani *focus trap*, penekanan tombol \`Escape\` untuk menutup, dan styling latar belakang via pseudo-elemen \`::backdrop\`.

\`\`\`html
<button onclick="document.getElementById('promo-dialog').showModal()">Buka Ketentuan</button>

<dialog id="promo-dialog">
  <h3>Syarat & Ketentuan Beasiswa</h3>
  <p>Program beasiswa ini terbuka bagi seluruh mahasiswa teknologi di Indonesia.</p>
  <button onclick="document.getElementById('promo-dialog').close()">Saya Mengerti</button>
</dialog>
\`\`\`

## 2. Widget Akordeon Native dengan \`<details>\` & \`<summary>\`
\`\`\`html
<details>
  <summary>Apakah saya mendapatkan sertifikat digital setelah lulus?</summary>
  <p>Ya, sertifikat digital terverifikasi dengan nomor registrasi unik akan otomatis terbit di dashboard Anda.</p>
</details>
\`\`\`
`,

  // BAB 4: Arsitektur Expert, SEO Teknis, Keamanan & Web Standards
  '4.1 SEO Teknis, Open Graph & Structured Data (JSON-LD / Schema.org)': `
## 1. Protokol Open Graph & Twitter Cards
Saat tautan halaman dibagikan di media sosial atau aplikasi perpesanan (WhatsApp, Telegram, LinkedIn), meta tags Open Graph menentukan thumbnail dan judul yang tampil:
\`\`\`html
<meta property="og:title" content="Mastering Modern HTML5: Dari Nol Hingga Standar Industri">
<meta property="og:description" content="Pelajari standar kurikulum web adaptif terlengkap.">
<meta property="og:image" content="https://skillsphere.id/images/og-html5.jpg">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
\`\`\`

## 2. Structured Data JSON-LD untuk Google Rich Snippets
\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Mastering Modern HTML5: Dari Nol Hingga Standar Industri",
  "description": "Panduan kurikulum komprehensif HTML5 standar industri.",
  "provider": {
    "@type": "Organization",
    "name": "SkillSphere AI",
    "sameAs": "https://skillsphere.id"
  }
}
</script>
\`\`\`
`,

  '4.2 Optimasi Performa & Core Web Vitals (LCP, INP, CLS)': `
## 1. Tiga Metrik Utama Core Web Vitals Google
- **LCP (Largest Contentful Paint <= 2.5s)**: Kecepatan memuat elemen visual terbesar (seperti gambar hero atau heading utama).
- **INP (Interaction to Next Paint <= 200ms)**: Responsivitas interaksi tombol saat diklik pengguna.
- **CLS (Cumulative Layout Shift <= 0.1)**: Stabilitas visual layout agar elemen tidak melompat secara tiba-tiba saat memuat aset.

## 2. Resource Hints untuk Akselerasi Aset Kritis
\`\`\`html
<!-- Preload Font Kritis -->
<link rel="preload" href="/fonts/newsreader.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preconnect ke CDN Aset Media -->
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
\`\`\`
`,

  '4.3 Keamanan Header & Proteksi Konten HTML (CSP, SRI, CORS, Iframe Sandbox)': `
## 1. Subresource Integrity (SRI)
SRI menjamin bahwa file script/CSS yang dimuat dari CDN pihak ketiga tidak disusupi kode berbahaya:
\`\`\`html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
      integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" 
      crossorigin="anonymous">
\`\`\`

## 2. Proteksi Iframe dengan Atribut \`sandbox\`
\`\`\`html
<iframe src="https://external-widget.com" sandbox="allow-scripts allow-same-origin" loading="lazy" title="Widget Eksternal"></iframe>
\`\`\`
`,

  '4.4 Web Components: Custom Elements, Shadow DOM & template': `
## 1. Enkapsulasi Komponen Web Standar W3C
Web Components memungkinkan pembuatan tag HTML kustom dengan gaya CSS yang terisolasi murni tanpa risiko tabrakan styling global.

\`\`\`html
<skillsphere-card title="Modul HTML5" status="Tersedia"></skillsphere-card>

<script>
  class SkillSphereCard extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      const title = this.getAttribute('title') || 'Judul Kartu';
      
      shadow.innerHTML = \`
        <style>
          .card { padding: 16px; border: 1px solid #E5E4DE; border-radius: 8px; font-family: sans-serif; background: #FAF9F5; }
          .title { font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #141413; }
        </style>
        <div class="card">
          <div class="title">\${title}</div>
          <slot>Konten kartu default.</slot>
        </div>
      \`;
    }
  }
  customElements.define('skillsphere-card', SkillSphereCard);
</script>
\`\`\`
`,

  '4.5 Fondasi Progressive Web Apps (PWA): Web App Manifest & Offline Strategy': `
## 1. Menjadikan Web Seperti Aplikasi Native (PWA)
Progressive Web App memungkinkan situs diinstal ke home screen smartphone dan dapat dibuka saat jaringan internet offline.

### Komponen Kunci \`manifest.json\`
\`\`\`json
{
  "name": "SkillSphere AI - Adaptive Learning",
  "short_name": "SkillSphere",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#141413",
  "theme_color": "#1F1E1B",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
\`\`\`
`
};

module.exports = html5Articles;
