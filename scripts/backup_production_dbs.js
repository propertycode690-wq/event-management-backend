const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const URL_INSTANCE_A = 'mysql://root:PRTPRVJMLydCnXnYRgazQxqOOCBhxIkz@centerbeam.proxy.rlwy.net:53549/railway';
const URL_INSTANCE_B = process.env.DATABASE_URL || 'mysql://root:wwOyLdhgbawFdXEoeBrvXeUQIyjlxxSw@iriguchi.proxy.rlwy.net:58182/railway';

async function backupInstance(label, connectionUrl, backupDir) {
  console.log(`\n=== Starting Backup for ${label} ===`);
  const conn = await mysql.createConnection(connectionUrl);
  const [tables] = await conn.query('SHOW TABLES');
  const tableNames = tables.map(r => Object.values(r)[0]);

  const backupData = {
    instanceLabel: label,
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of tableNames) {
    const [[createTableRes]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createTableRes['Create Table'];
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);

    // Sanitize any passwordHash in user tables for backup security or store safely
    backupData.tables[table] = {
      schema: createSql,
      rowCount: rows.length,
      data: rows
    };
    console.log(`  - Table \`${table}\`: ${rows.length} rows backed up`);
  }

  await conn.end();

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup_${label}_${timestampStr}.json`;
  const filePath = path.join(backupDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  const stats = fs.statSync(filePath);

  console.log(`✅ Backup completed: ${fileName} (${stats.size} bytes)`);

  // Verify backup can be parsed back
  const readBack = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const verifiedTables = Object.keys(readBack.tables);
  console.log(`✅ Verified integrity: ${verifiedTables.length} tables parsed successfully.`);

  return {
    label,
    fileName,
    filePath,
    sizeBytes: stats.size,
    tableCount: verifiedTables.length,
    tableSummary: Object.fromEntries(
      Object.entries(readBack.tables).map(([k, v]) => [k, v.rowCount])
    )
  };
}

async function run() {
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const resultA = await backupInstance('Current_Live_Railway_InstanceA_centerbeam', URL_INSTANCE_A, backupDir);
  const resultB = await backupInstance('Candidate_50States_InstanceB_iriguchi', URL_INSTANCE_B, backupDir);

  const summaryPath = path.join(backupDir, 'latest_backup_verification.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ resultA, resultB }, null, 2), 'utf-8');

  console.log('\n================ BACKUP SUMMARY ================');
  console.log('Instance A (Current Live centerbeam):', JSON.stringify(resultA.tableSummary));
  console.log('Instance B (Candidate 50-State iriguchi):', JSON.stringify(resultB.tableSummary));
  console.log('Summary written to:', summaryPath);
}

run().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});

