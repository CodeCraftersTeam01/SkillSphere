const { Course, CourseSection, CourseMaterial } = require('../models');
const sequelize = require('../config/database');
const html5Articles = require('./html5ArticlesData');

async function seedDatabaseArticles() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // Sync CourseMaterial model to alter table schema in MySQL
    await CourseMaterial.sync({ alter: true });
    console.log('✅ Synchronized course_materials table schema with content_text column.');

    for (const [title, contentText] of Object.entries(html5Articles)) {
      const updated = await CourseMaterial.update(
        { content_text: contentText.trim(), content_type: 'book' },
        { where: { title: title.trim() } }
      );
      if (updated[0] > 0) {
        console.log(`  ✔ Updated content_text in DB for: "${title}"`);
      } else {
        console.log(`  ⚠️ Material title not found: "${title}"`);
      }
    }

    console.log('🎉 Database Course Materials successfully populated with dynamic text!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding articles:', err);
    process.exit(1);
  }
}

seedDatabaseArticles();
