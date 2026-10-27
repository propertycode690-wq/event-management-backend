const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function setupClaims() {
  console.log('Connecting to Railway MySQL database...');
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  console.log('Creating ClubClaim table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`ClubClaim\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`club\` VARCHAR(191) NOT NULL,
      \`state\` VARCHAR(10) NOT NULL,
      \`applicant\` VARCHAR(191) NOT NULL,
      \`email\` VARCHAR(191) NOT NULL,
      \`phone\` VARCHAR(50),
      \`submittedDate\` VARCHAR(50),
      \`claimStatus\` VARCHAR(50) DEFAULT 'Pending',
      \`verificationStatus\` VARCHAR(191),
      \`message\` TEXT,
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('Seeding initial claims...');
  const claims = [
    {
      id: 'CLM-501',
      club: 'Hawaii State Association',
      state: 'HI',
      applicant: 'James Wadley',
      email: 'Houstonroofing@yahoo.com',
      phone: '(713) 555-0192',
      submittedDate: 'Oct 23, 2026',
      claimStatus: 'Pending',
      verificationStatus: 'Pending Verification',
      message: 'Official state association administration & treasury bank account setup for Hawaii sandbox.'
    },
    {
      id: 'CLM-502',
      club: 'Texas Hound Association',
      state: 'TX',
      applicant: 'James Wadley',
      email: 'Houstonroofing@yahoo.com',
      phone: '(713) 555-0192',
      submittedDate: 'Oct 23, 2026',
      claimStatus: 'Pending',
      verificationStatus: 'Tax ID & Charter Submitted',
      message: 'Application to administer Texas State Hound Association and affiliate local hunting clubs.'
    },
    {
      id: 'CLM-503',
      club: 'Tennessee State Association',
      state: 'TN',
      applicant: 'James Wadley',
      email: 'Houstonroofing@yahoo.com',
      phone: '(713) 555-0192',
      submittedDate: 'Oct 22, 2026',
      claimStatus: 'Pending',
      verificationStatus: 'Officer Application Submitted',
      message: 'State director registration for Tennessee field trials and Oak Ridge hunting club.'
    },
    {
      id: 'CLM-401',
      club: 'Oak Ridge Hunting Club',
      state: 'TN',
      applicant: 'Robert Miller',
      email: 'robert.miller@oakridgehc.org',
      phone: '(865) 555-0199',
      submittedDate: 'Aug 06, 2026',
      claimStatus: 'Pending',
      verificationStatus: 'Charter Uploaded',
      message: 'Requesting administrative rights to update the Oak Ridge club page.'
    },
    {
      id: 'CLM-402',
      club: 'Cumberland Mountain Club',
      state: 'KY',
      applicant: 'James Wadley',
      email: 'Houstonroofing@yahoo.com',
      phone: '(713) 555-0192',
      submittedDate: 'Aug 02, 2026',
      claimStatus: 'Approved',
      verificationStatus: 'Tax ID Verified',
      message: 'Verified administrator for Cumberland Mountain Club.'
    }
  ];

  for (const c of claims) {
    await conn.query(
      `INSERT INTO \`ClubClaim\` (id, club, state, applicant, email, phone, submittedDate, claimStatus, verificationStatus, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         club = VALUES(club),
         state = VALUES(state),
         applicant = VALUES(applicant),
         email = VALUES(email),
         phone = VALUES(phone),
         claimStatus = VALUES(claimStatus),
         verificationStatus = VALUES(verificationStatus),
         message = VALUES(message)`,
      [c.id, c.club, c.state, c.applicant, c.email, c.phone, c.submittedDate, c.claimStatus, c.verificationStatus, c.message]
    );
  }

  const [rows] = await conn.query('SELECT * FROM `ClubClaim`');
  console.log(`✅ Total Club Claims in MySQL DB: ${rows.length}`);
  console.log(rows);

  await conn.end();
}

setupClaims().catch(console.error);
