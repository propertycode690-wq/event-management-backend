const mysql = require('mysql2/promise');

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:wwOyLdhgbawFdXEoeBrvXeUQIyjlxxSw@iriguchi.proxy.rlwy.net:58182/railway';

async function syncSchema() {
  const pool = mysql.createPool(DATABASE_URL);

  // 1. Create CompetitionResult if missing
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`CompetitionResult\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`eventId\` VARCHAR(191) DEFAULT NULL,
      \`eventName\` VARCHAR(191) NOT NULL,
      \`club\` VARCHAR(191) DEFAULT NULL,
      \`state\` VARCHAR(191) DEFAULT NULL,
      \`stateCode\` VARCHAR(10) DEFAULT NULL,
      \`placement\` VARCHAR(50) DEFAULT NULL,
      \`place\` INT DEFAULT 1,
      \`winnerDog\` VARCHAR(191) NOT NULL,
      \`winnerDogReg\` VARCHAR(191) DEFAULT NULL,
      \`breed\` VARCHAR(191) DEFAULT 'Coonhound',
      \`owner\` VARCHAR(191) DEFAULT NULL,
      \`participant\` VARCHAR(191) NOT NULL,
      \`score\` VARCHAR(50) DEFAULT '0 Pts',
      \`date\` VARCHAR(50) DEFAULT NULL,
      \`status\` VARCHAR(50) DEFAULT 'Published',
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);
  console.log('✅ CompetitionResult table verified on Railway DB');

  // 2. Ensure columns in Order table
  const [orderCols] = await pool.query('DESCRIBE `Order`');
  const colNames = orderCols.map(c => c.Field);

  if (!colNames.includes('fulfillmentStatus')) {
    await pool.query("ALTER TABLE `Order` ADD COLUMN `fulfillmentStatus` VARCHAR(50) DEFAULT 'Processing'");
    console.log('Added fulfillmentStatus to Order');
  }
  if (!colNames.includes('payoutStatus')) {
    await pool.query("ALTER TABLE `Order` ADD COLUMN `payoutStatus` VARCHAR(50) DEFAULT 'Pending'");
    console.log('Added payoutStatus to Order');
  }
  if (!colNames.includes('trackingNumber')) {
    await pool.query("ALTER TABLE `Order` ADD COLUMN `trackingNumber` VARCHAR(191) DEFAULT 'Pending Dispatch'");
    console.log('Added trackingNumber to Order');
  }
  if (!colNames.includes('carrier')) {
    await pool.query("ALTER TABLE `Order` ADD COLUMN `carrier` VARCHAR(191) DEFAULT 'UPS Ground'");
    console.log('Added carrier to Order');
  }
  if (!colNames.includes('clubId')) {
    await pool.query("ALTER TABLE `Order` ADD COLUMN `clubId` VARCHAR(191) DEFAULT NULL");
    console.log('Added clubId to Order');
  }

  // 3. Ensure columns in Event table
  const [eventCols] = await pool.query('DESCRIBE `Event`');
  const evtColNames = eventCols.map(c => c.Field);
  if (!evtColNames.includes('deadline')) {
    await pool.query("ALTER TABLE `Event` ADD COLUMN `deadline` VARCHAR(191) DEFAULT 'Sep 18, 2026'");
    console.log('Added deadline to Event');
  }
  if (!evtColNames.includes('address')) {
    await pool.query("ALTER TABLE `Event` ADD COLUMN `address` VARCHAR(255) DEFAULT '1420 Hunting Ridge Rd, Knoxville, TN 37901'");
    console.log('Added address to Event');
  }
  if (!evtColNames.includes('description')) {
    await pool.query("ALTER TABLE `Event` ADD COLUMN `description` TEXT DEFAULT NULL");
    console.log('Added description to Event');
  }
  if (!evtColNames.includes('startTime')) {
    await pool.query("ALTER TABLE `Event` ADD COLUMN `startTime` VARCHAR(50) DEFAULT '7:00 PM'");
    console.log('Added startTime to Event');
  }

  // 4. Ensure status column in User table
  const [userCols] = await pool.query('DESCRIBE `User`');
  const userColNames = userCols.map(c => c.Field);
  if (!userColNames.includes('status')) {
    await pool.query("ALTER TABLE `User` ADD COLUMN `status` VARCHAR(50) DEFAULT 'Active'");
    console.log('Added status to User table');
  }

  await pool.end();
  console.log('✅ Railway database schema fully synchronized!');
}

syncSchema().catch(err => {
  console.error('Schema sync error:', err);
  process.exit(1);
});
