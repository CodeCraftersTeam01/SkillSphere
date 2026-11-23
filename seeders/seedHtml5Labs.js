const { Op } = require('sequelize');
const { sequelize, Course, Category, User, LabExercise } = require('../models');

const HTML5_COURSE_SLUG = 'mastering-modern-html5-expert';
const HTML5_COURSE_TITLE = 'Mastering Modern HTML5: Dari Nol Hingga Standar Industri & Web Expert';

const HTML5_LABS_DATA = [
  // =========================================================================
  // RUANG PRAKTIKUM (4 Tugas Terstruktur - Mastering Modern HTML5)
  // =========================================================================
  {
    room_type: 'practicum',
    challenge_mode: 'create',
    title: 'Praktikum 1: Struktur Semantik Halaman Artikel HTML5',
    description:
      'Bangun kerangka dokumen HTML5 lengkap untuk halaman artikel pembelajaran SkillSphere menggunakan elemen semantik standar industri: <!DOCTYPE html>, <html lang="id">, <header>, <nav>, <main>, <article>, <section>, <aside>, dan <footer>. Pastikan terdapat tepat satu <h1> sebagai judul utama artikel dan minimal satu <h2> di dalam <section>.',
    language: 'html',
    difficulty: 'beginner',
    starter_code: `<!-- Praktikum 1: Lengkapi struktur dokumen semantik HTML5 di bawah ini -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Artikel Semantik HTML5</title>
</head>
<body>
  <!-- Tulis header, nav, main (article + section + aside), dan footer di sini -->

</body>
</html>`,
    solution_reference: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Artikel Semantik HTML5</title>
</head>
<body>
  <header>
    <nav aria-label="Navigasi Utama">
      <a href="/">Beranda</a>
      <a href="/courses">Kursus</a>
    </nav>
  </header>
  <main>
    <article>
      <h1>Mengenal Elemen Semantik Modern di HTML5</h1>
      <section>
        <h2>Mengapa Semantik Penting untuk SEO dan Aksesibilitas</h2>
        <p>Elemen semantik membantu mesin pencari dan pembaca layar memahami struktur konten halaman secara akurat.</p>
      </section>
    </article>
    <aside>
      <h2>Artikel Terkait</h2>
      <p>Pelajari juga standar aksesibilitas WCAG 2.2 untuk antarmuka web modern.</p>
    </aside>
  </main>
  <footer>
    <p>&copy; 2026 SkillSphere AI</p>
  </footer>
</body>
</html>`,
    expected_output:
      'Dokumen HTML5 valid memakai landmark semantik (<header>, <nav>, <main>, <article>, <section>, <aside>, <footer>), atribut lang="id", satu <h1>, dan subjudul <h2>.',
    test_cases: [
      {
        input: 'Tag deklarasi & bahasa',
        expected: 'Memiliki <!DOCTYPE html> dan <html lang="id">',
        description: 'Deklarasi dokumen HTML5 dan bahasa Indonesia',
      },
      {
        input: 'Landmark utama',
        expected: 'Memiliki <header>, <nav>, <main>, <article>, <aside>, dan <footer>',
        description: 'Kelengkapan seluruh tag semantik utama',
      },
      {
        input: 'Hirarki judul',
        expected: 'Memiliki <h1> untuk judul utama dan <h2> di dalam <section>',
        description: 'Hirarki heading yang terstruktur',
      },
    ],
    hints: [
      'Hindari membungkus semua bagian dengan <div>; ganti dengan <header>, <main>, <article>, <aside>, dan <footer>.',
      'Letakkan <article> dan <aside> di dalam tag <main> agar struktur konten utama jelas bagi screen reader.',
      'Tambahkan <meta name="viewport" content="width=device-width, initial-scale=1.0"> di dalam <head>.',
    ],
    passing_score: 75,
    is_published: true,
  },
  {
    room_type: 'practicum',
    challenge_mode: 'fix',
    title: 'Praktikum 2: Perbaiki Bug & Aksesibilitas Formulir Pendaftaran HTML5',
    description:
      'Kode formulir pendaftaran webinar HTML5 berikut memiliki beberapa bug struktur dan aksesibilitas: tag <label> tidak terhubung ke input via for/id, tipe input email dan validasi required hilang, atribut name belum diisi, dan tombol submit masih memakai <div> yang tidak bisa diakses keyboard. Perbaiki seluruh bug tersebut agar formulir valid dan aksesibel.',
    language: 'html',
    difficulty: 'beginner',
    starter_code: `<form action="/api/webinar/register" method="POST">
  <div>
    <label>Nama Lengkap</label>
    <input type="text" placeholder="Masukkan nama Anda">
  </div>
  <div>
    <label for="wrongId">Alamat Email</label>
    <input id="emailInput" type="text" placeholder="nama@email.com">
  </div>
  <div>
    <label>Kata Sandi</label>
    <input type="text" id="passwordInput">
  </div>
  <div class="btn-submit">Daftar Sekarang</div>
</form>`,
    solution_reference: `<form action="/api/webinar/register" method="POST">
  <div>
    <label for="fullName">Nama Lengkap</label>
    <input id="fullName" name="full_name" type="text" required minlength="3" placeholder="Masukkan nama Anda">
  </div>
  <div>
    <label for="emailInput">Alamat Email</label>
    <input id="emailInput" name="email" type="email" required autocomplete="email" placeholder="nama@email.com">
  </div>
  <div>
    <label for="passwordInput">Kata Sandi</label>
    <input id="passwordInput" name="password" type="password" required minlength="8" autocomplete="new-password">
  </div>
  <button type="submit" class="btn-submit">Daftar Sekarang</button>
</form>`,
    expected_output:
      'Semua <label for="..."> cocok dengan id masing-masing <input>, input memiliki atribut name, type="email", type="password", required, dan tombol menggunakan <button type="submit">.',
    test_cases: [
      {
        input: 'Relasi label dan input',
        expected: 'Setiap <label for="..."> terhubung ke atribut id yang sama pada <input>',
        description: 'Aksesibilitas label formulir sesuai WCAG',
      },
      {
        input: 'Tipe input & validasi native HTML5',
        expected: 'Email memakai type="email", sandi memakai type="password", seluruh field wajib memakai required dan name',
        description: 'Validasi bawaan HTML5 dan pengiriman data POST',
      },
      {
        input: 'Tombol submit semantik',
        expected: 'Menggunakan <button type="submit"> bukan <div>',
        description: 'Dukungan navigasi keyboard dan submit native',
      },
    ],
    hints: [
      'Cocokkan atribut for="emailInput" pada <label> dengan id="emailInput" pada <input>.',
      'Ubah input kata sandi menjadi type="password" dan email menjadi type="email" lengkap dengan atribut name dan required.',
      'Ganti <div class="btn-submit"> menjadi <button type="submit" class="btn-submit">.',
    ],
    passing_score: 75,
    is_published: true,
  },
  {
    room_type: 'practicum',
    challenge_mode: 'create',
    title: 'Praktikum 3: Tabel Data Kurikulum HTML5 yang Aksesibel (WCAG)',
    description:
      'Buat komponen tabel data jadwal praktikum HTML5 menggunakan elemen tabel semantik lengkap: <table>, <caption>, <thead>, <tbody>, dan <tfoot>. Gunakan tag <th> dengan atribut scope="col" untuk header kolom (Modul, Topik, Durasi) serta scope="row" pada judul baris di <tbody>, lalu tampilkan total durasi pada <tfoot>.',
    language: 'html',
    difficulty: 'intermediate',
    starter_code: `<!-- Praktikum 3: Buat tabel kurikulum HTML5 lengkap dengan caption, thead, tbody, tfoot, dan scope -->
<table>

</table>`,
    solution_reference: `<table>
  <caption>Jadwal Praktikum Mastering Modern HTML5</caption>
  <thead>
    <tr>
      <th scope="col">Modul</th>
      <th scope="col">Topik Praktikum</th>
      <th scope="col">Durasi</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Bab 1</th>
      <td>Struktur Semantik &amp; Landmark</td>
      <td>45 Menit</td>
    </tr>
    <tr>
      <th scope="row">Bab 2</th>
      <td>Formulir Interaktif &amp; Validasi</td>
      <td>60 Menit</td>
    </tr>
    <tr>
      <th scope="row">Bab 3</th>
      <td>Aksesibilitas WCAG &amp; Media</td>
      <td>50 Menit</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row" colspan="2">Total Durasi Praktikum</th>
      <td>155 Menit</td>
    </tr>
  </tfoot>
</table>`,
    expected_output:
      'Tabel memiliki <caption>, <thead>, <tbody>, <tfoot>, atribut scope="col" dan scope="row", serta baris ringkasan total di <tfoot>.',
    test_cases: [
      {
        input: 'Judul tabel semantik',
        expected: 'Memiliki elemen <caption> langsung di dalam <table>',
        description: 'Caption deskriptif untuk pembaca layar',
      },
      {
        input: 'Pengelompokan baris tabel',
        expected: 'Memiliki <thead>, <tbody>, dan <tfoot> yang terpisah rapi',
        description: 'Struktur anatomi tabel HTML5',
      },
      {
        input: 'Atribut scope header',
        expected: 'Header kolom memakai scope="col" dan header baris memakai scope="row"',
        description: 'Pemetaan sel data aksesibel WCAG',
      },
    ],
    hints: [
      'Elemen <caption> harus diletakkan sebagai anak pertama di dalam <table>.',
      'Gunakan <th scope="col"> di dalam <thead> dan <th scope="row"> pada kolom pertama tiap baris <tbody>.',
      'Gunakan colspan="2" di dalam <tfoot> untuk menggabungkan label total durasi.',
    ],
    passing_score: 75,
    is_published: true,
  },
  {
    room_type: 'practicum',
    challenge_mode: 'fix',
    title: 'Praktikum 4: Perbaiki Optimasi Media, SEO Meta & Core Web Vitals',
    description:
      'Halaman landing kursus HTML5 di bawah ini memiliki skor Lighthouse rendah karena: tag <meta name="viewport"> dan <meta name="description"> hilang, gambar hero tidak memiliki atribut alt, width, height (menyebabkan CLS), gambar di bawah lipatan tidak memakai loading="lazy", dan hirarki heading melompat langsung dari <h1> ke <h4>. Perbaiki kode tersebut agar siap produksi.',
    language: 'html',
    difficulty: 'advanced',
    starter_code: `<!DOCTYPE html>
<html>
<head>
  <title>Kursus HTML5</title>
</head>
<body>
  <main>
    <h1>Mastering Modern HTML5</h1>
    <img src="/images/hero-html5.webp">
    <h4>Materi Unggulan</h4>
    <img src="/images/modul-wcag.webp">
  </main>
</body>
</html>`,
    solution_reference: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Pelajari Mastering Modern HTML5 mulai dari semantik, aksesibilitas WCAG, hingga optimasi Core Web Vitals.">
  <title>Mastering Modern HTML5 - SkillSphere AI</title>
</head>
<body>
  <main>
    <h1>Mastering Modern HTML5</h1>
    <img src="/images/hero-html5.webp" alt="Ilustrasi arsitektur modern HTML5 di SkillSphere" width="1200" height="630" fetchpriority="high">
    <h2>Materi Unggulan</h2>
    <img src="/images/modul-wcag.webp" alt="Diagram panduan aksesibilitas WCAG 2.2" width="800" height="450" loading="lazy" decoding="async">
  </main>
</body>
</html>`,
    expected_output:
      'Memiliki lang="id", meta charset, meta viewport, meta description, seluruh <img> memiliki alt + width + height, gambar kedua memakai loading="lazy", dan heading berurutan (<h1> lalu <h2>).',
    test_cases: [
      {
        input: 'Metadata SEO & Mobile',
        expected: 'Memiliki <html lang="id">, <meta charset="UTF-8">, <meta name="viewport">, dan <meta name="description">',
        description: 'Kepatuhan SEO dasar dan tampilan responsif mobile',
      },
      {
        input: 'Optimasi CLS & Lazy Loading',
        expected: 'Semua <img> memiliki alt, width, height; gambar di bawah lipatan memakai loading="lazy"',
        description: 'Mencegah Cumulative Layout Shift (CLS) dan hemat bandwidth',
      },
      {
        input: 'Urutan Heading Semantik',
        expected: 'Mengubah <h4> menjadi <h2> tepat setelah <h1>',
        description: 'Tidak melompati level heading',
      },
    ],
    hints: [
      'Tambahkan atribut width dan height eksplisit pada setiap <img> agar browser dapat memesan ruang layout sejak awal.',
      'Gambar kedua berada di bawah lipatan (below the fold), tambahkan loading="lazy" dan decoding="async".',
      'Jangan melompat dari <h1> langsung ke <h4>; gunakan <h2> untuk subbagian tingkat pertama.',
    ],
    passing_score: 80,
    is_published: true,
  },

  // =========================================================================
  // RUANG LAB (2 Latihan Eksplorasi HTML5 - Mastering Modern HTML5)
  // =========================================================================
  {
    room_type: 'lab',
    challenge_mode: 'create',
    title: 'Lab HTML5: Kartu Profil Instruktur dengan Figure, Time & Address',
    description:
      'Eksplorasi elemen semantik mikro HTML5 dengan membuat kartu profil instruktur menggunakan <article>, <figure>, <figcaption>, <time datetime="..."> untuk tanggal publikasi, serta <address> untuk tautan kontak resmi (mailto:).',
    language: 'html',
    difficulty: 'beginner',
    starter_code: `<!-- Lab HTML5: Buat kartu profil instruktur semantik -->
<article class="instructor-card">

</article>`,
    solution_reference: `<article class="instructor-card">
  <figure>
    <img src="/images/tutor-html5.webp" alt="Foto profil instruktur HTML5 Arjuna Lanang" width="160" height="160">
    <figcaption>Arjuna Lanang - Principal Frontend Engineer</figcaption>
  </figure>
  <h2>Tentang Pengajar</h2>
  <p>Mengajar standar web modern dan aksesibilitas sejak <time datetime="2020-01-15">15 Januari 2020</time>.</p>
  <address>
    Hubungi instruktur: <a href="mailto:arjuna.tutor@skillsphere.id">arjuna.tutor@skillsphere.id</a>
  </address>
</article>`,
    expected_output:
      'Komponen <article> memuat <figure> + <img alt="..."> + <figcaption>, elemen <time datetime="...">, dan <address> berisi tautan mailto.',
    test_cases: [
      {
        input: 'Media & Keterangan',
        expected: 'Menggunakan <figure>, <img alt="...">, dan <figcaption>',
        description: 'Pengelompokan gambar dan caption secara semantik',
      },
      {
        input: 'Metadata Waktu & Kontak',
        expected: 'Menggunakan <time datetime="..."> dan <address> dengan href="mailto:..."',
        description: 'Elemen semantik mesin untuk tanggal dan kontak',
      },
    ],
    hints: [
      'Bungkus <img> dan teks keterangan nama instruktur di dalam <figure> dan <figcaption>.',
      'Gunakan format ISO YYYY-MM-DD pada atribut datetime di tag <time>.',
    ],
    passing_score: 75,
    is_published: true,
  },
  {
    room_type: 'lab',
    challenge_mode: 'fix',
    title: 'Lab HTML5: Perbaiki Komponen FAQ Details, Summary & ARIA Landmark',
    description:
      'Komponen FAQ interaktif HTML5 berikut rusak: elemen <details> tidak memiliki tag <summary> sehingga label pertanyaan tidak muncul rapi, navigasi breadcrumb tidak memiliki aria-label, dan tombol buka panduan masih memakai <span> dengan onclick. Perbaiki agar menggunakan HTML5 native yang bersih dan aksesibel.',
    language: 'html',
    difficulty: 'intermediate',
    starter_code: `<nav>
  <a href="/courses">Kursus</a> / <span>Mastering Modern HTML5</span>
</nav>
<details>
  <p>Apakah kursus HTML5 ini cocok untuk pemula?</p>
  <p>Ya, materi dimulai dari anatomi dokumen dasar hingga Web Components.</p>
</details>
<span onclick="openGuide()">Buka Panduan Praktikum</span>`,
    solution_reference: `<nav aria-label="Breadcrumb">
  <a href="/courses">Kursus</a> / <span aria-current="page">Mastering Modern HTML5</span>
</nav>
<details>
  <summary>Apakah kursus HTML5 ini cocok untuk pemula?</summary>
  <p>Ya, materi dimulai dari anatomi dokumen dasar hingga Web Components.</p>
</details>
<button type="button" onclick="openGuide()">Buka Panduan Praktikum</button>`,
    expected_output:
      'Memiliki <nav aria-label="Breadcrumb">, <summary> di dalam <details>, dan <button type="button"> menggantikan <span> klikabel.',
    test_cases: [
      {
        input: 'Accordion native HTML5',
        expected: 'Pertanyaan di dalam <details> dibungkus dengan <summary>',
        description: 'Elemen interaktif native tanpa JavaScript tambahan',
      },
      {
        input: 'Aksesibilitas Navigasi & Tombol',
        expected: '<nav> memiliki aria-label dan elemen aksi memakai <button type="button">',
        description: 'Standar interaksi keyboard dan pembaca layar',
      },
    ],
    hints: [
      'Tag pertama di dalam <details> harus berupa <summary> sebagai judul yang bisa diklik.',
      'Tambahkan aria-label="Breadcrumb" pada <nav> dan ubah <span> klikabel menjadi <button type="button">.',
    ],
    passing_score: 75,
    is_published: true,
  },
];

async function seedHtml5Labs({ courseId = null, creatorId = null } = {}) {
  let targetCourse = null;

  if (courseId) {
    targetCourse = await Course.findByPk(courseId);
  }

  if (!targetCourse) {
    targetCourse = await Course.findOne({
      where: {
        [Op.or]: [
          { slug: HTML5_COURSE_SLUG },
          { title: { [Op.like]: '%Mastering Modern HTML5%' } },
          { title: { [Op.like]: '%HTML5%' } },
        ],
      },
    });
  }

  // Resolve creator (tutor -> admin -> first user)
  let creator = creatorId ? await User.findByPk(creatorId) : null;
  if (!creator && targetCourse && targetCourse.tutor_id) {
    creator = await User.findByPk(targetCourse.tutor_id);
  }
  if (!creator) {
    creator = await User.findOne({ where: { role: 'tutor' }, order: [['id', 'ASC']] });
  }
  if (!creator) {
    creator = await User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']] });
  }
  if (!creator) {
    creator = await User.findOne({ order: [['id', 'ASC']] });
  }

  if (!creator) {
    throw new Error('Tidak ada akun user di database. Jalankan seeder user terlebih dahulu.');
  }

  // Create Mastering Modern HTML5 course if it does not exist yet in this DB
  if (!targetCourse) {
    const [category] = await Category.findOrCreate({
      where: { slug: 'frontend-ui-ux' },
      defaults: {
        name: 'Frontend & UI/UX Engineering',
        slug: 'frontend-ui-ux',
        description: 'HTML5, CSS3, Desain Interaktif, dan Aksesibilitas Web',
      },
    });

    targetCourse = await Course.create({
      tutor_id: creator.id,
      category_id: category.id,
      title: HTML5_COURSE_TITLE,
      slug: HTML5_COURSE_SLUG,
      description:
        'Panduan kurikulum komprehensif HTML5 dari pondasi sintaks dasar, formulir interaktif, semantik modern, aksesibilitas WCAG, optimasi Core Web Vitals, hingga Web Components tingkat lanjut.',
      thumbnail_url: null,
      price: 0.0,
      level: 'beginner',
      rating_avg: 4.95,
      rating_count: 142,
      status: 'published',
    });
  }

  const created = [];
  const skipped = [];

  for (const item of HTML5_LABS_DATA) {
    const existing = await LabExercise.findOne({
      where: {
        title: item.title,
        course_id: targetCourse.id,
      },
    });

    if (existing) {
      skipped.push(existing);
      continue;
    }

    const lab = await LabExercise.create({
      ...item,
      course_id: targetCourse.id,
      created_by: creator.id,
    });
    created.push(lab);
  }

  return {
    course: targetCourse,
    createdCount: created.length,
    skippedCount: skipped.length,
    labs: [...created, ...skipped],
  };
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      const result = await seedHtml5Labs();
      console.log(
        `[seedHtml5Labs] Kursus: "${result.course.title}" (ID: ${result.course.id}) | Dibuat: ${result.createdCount} | Sudah ada: ${result.skippedCount}`
      );
      process.exit(0);
    } catch (err) {
      console.error('[seedHtml5Labs] Error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { seedHtml5Labs, HTML5_LABS_DATA };
