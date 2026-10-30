const mysql = require('../node_modules/mysql2/promise');

async function checkSchema() {
  const conn = await mysql.createConnection('mysql://root:wwOyLdhgbawFdXEoeBrvXeUQIyjlxxSw@iriguchi.proxy.rlwy.net:58182/railway');
  const [tables] = await conn.query('SHOW TABLES');
  console.log('Tables in Instance B:', tables.map(t => Object.values(t)[0]));
  
  const [userCols] = await conn.query('DESCRIBE User');
  console.log('User columns in Instance B:', userCols.map(c => c.Field));
  
  const [orderCols] = await conn.query('DESCRIBE `Order`');
  console.log('Order columns in Instance B:', orderCols.map(c => c.Field));
  
  const [eventCols] = await conn.query('DESCRIBE Event');
  console.log('Event columns in Instance B:', eventCols.map(c => c.Field));

  const [clubClaims] = await conn.query('SELECT COUNT(*) as count FROM ClubClaim');
  console.log('ClubClaims count in Instance B:', clubClaims[0].count);

  const [products] = await conn.query('SELECT COUNT(*) as count FROM Product');
  console.log('Products count in Instance B:', products[0].count);

  await conn.end();
}

checkSchema().catch(console.error);

