const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function importClubSQL() {
  console.log('🚀 Reading backend/club.sql...');
  const sqlFilePath = path.join(__dirname, 'club.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('📡 Connecting to MySQL Server (127.0.0.1:3306)...');
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    multipleStatements: true
  });

  console.log('✅ Connected! Resetting and creating fresh `club` database...');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP DATABASE IF EXISTS `club`;');
  await connection.query('CREATE DATABASE `club`;');
  await connection.query('USE `club`;');

  console.log('📥 Importing all tables and data from club.sql into MySQL `club` DB...');
  await connection.query(sqlContent);
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  console.log('🎉 Successfully imported club.sql into MySQL `club` database!');

  // Verify tables
  const [tables] = await connection.query('SHOW TABLES;');
  console.log('📊 Verified Tables in `club` database:', tables.map(t => Object.values(t)[0]));

  await connection.end();
}

importClubSQL().catch((err) => {
  console.error('❌ Import Failed:', err.message);
  process.exit(1);
});
