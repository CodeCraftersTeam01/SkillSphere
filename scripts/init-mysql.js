const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const database = process.env.DB_NAME || 'skillsphere';

  console.log(`Connecting to MySQL on ${host}:${port} as ${user}...`);
  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    console.log('✅ Connected to MySQL server.');

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database \`${database}\` ensured.`);

    await conn.end();
    console.log('MySQL setup ready.');
  } catch (err) {
    console.error('❌ Error connecting to MySQL:', err.message);
    process.exit(1);
  }
}

initDB();
