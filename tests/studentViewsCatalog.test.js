const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

async function runStudentViewsCatalogTests() {
  console.log('🧪 Starting Student FE & Course Catalog Test Suite (Sprint 1 & Sprint 2 - Fadiyah)...\n');

  const viewsToTest = [
    { name: 'Login Page', file: 'views/login.ejs', data: { title: 'Masuk | SkillSphere AI' } },
    { name: 'Register Page with OTP Modal', file: 'views/register.ejs', data: { title: 'Daftar Akun | SkillSphere AI' } },
    { name: 'Onboarding 5-Step Personalization', file: 'views/onboarding.ejs', data: { title: 'Personalisasi Belajar | SkillSphere AI' } },
    { name: 'Dashboard Student Portal', file: 'views/dashboard.ejs', data: { title: 'Dashboard | SkillSphere AI' } },
    { name: 'Student Profile & Settings Page', file: 'views/profile.ejs', data: { title: 'Profil & Pengaturan Akun | SkillSphere AI' } },
    { name: 'Course Catalog & Search Page', file: 'views/courses/index.ejs', data: { title: 'Katalog Kursus & Kurikulum | SkillSphere AI' } },
    { name: 'Course Detail & Syllabus Page', file: 'views/courses/detail.ejs', data: { title: 'Detail Kursus | SkillSphere AI', courseId: '1' } },
  ];

  for (const item of viewsToTest) {
    const filePath = path.resolve(__dirname, '..', item.file);
    assert(fs.existsSync(filePath), `File view ${item.file} harus ada di disk.`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.length > 0, `File view ${item.file} tidak boleh kosong.`);

    // Test EJS compilation without syntax errors
    try {
      const compiled = ejs.compile(content, { filename: filePath });
      const renderedHtml = compiled(item.data);
      assert(renderedHtml.includes('<!DOCTYPE html>') || renderedHtml.includes('<html'), `Rendered HTML for ${item.name} harus valid.`);
      console.log(`  ✔ EJS view ${item.name} (${item.file}) compiled and rendered cleanly.`);
    } catch (err) {
      console.error(`  ❌ Error compiling ${item.file}:`, err);
      process.exit(1);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 ALL STUDENT FE & CATALOG TESTS PASSED (SPRINT 1 & 2 - FADIYAH)!');
  console.log('======================================================\n');
}

runStudentViewsCatalogTests();
