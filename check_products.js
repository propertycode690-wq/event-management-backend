const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [rows] = await conn.query('SELECT id, name, price, category, scopeChannel FROM `Product`');
  console.log('Product count in DB:', rows.length);
  console.log(rows);
  await conn.end();
}
run().catch(console.error);
