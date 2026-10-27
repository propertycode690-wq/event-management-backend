const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupMySQL() {
  console.log('🚀 Connecting to MySQL server on 127.0.0.1 (XAMPP / phpMyAdmin)...');

  try {
    // 1. Connect without database first to ensure `club` database exists
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL Server!');

    // Create database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS `club`;');
    await connection.query('USE `club`;');

    console.log('🛠️ Creating all 11 project tables in `club` database...');

    // 1. User Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`User\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`passwordHash\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`role\` VARCHAR(50) DEFAULT 'MEMBER',
        \`phone\` VARCHAR(50),
        \`stateCode\` VARCHAR(10),
        \`clubId\` VARCHAR(191),
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Member Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`Member\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`phone\` VARCHAR(50),
        \`state\` VARCHAR(191),
        \`club\` VARCHAR(191),
        \`status\` VARCHAR(50) DEFAULT 'Active',
        \`duesAmount\` DOUBLE DEFAULT 35.0,
        \`joinDate\` VARCHAR(50),
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. StateAssociation Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`StateAssociation\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(10) NOT NULL UNIQUE,
        \`organizations\` VARCHAR(191) DEFAULT 'UKC,PKC',
        \`adminName\` VARCHAR(191),
        \`clubsCount\` INT DEFAULT 0,
        \`membersCount\` INT DEFAULT 0,
        \`eventsCount\` INT DEFAULT 0,
        \`revenue\` DOUBLE DEFAULT 0.0,
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. LocalClub Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`LocalClub\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL,
        \`city\` VARCHAR(191) NOT NULL,
        \`county\` VARCHAR(191),
        \`state\` VARCHAR(191) NOT NULL,
        \`stateCode\` VARCHAR(10) NOT NULL,
        \`stateId\` VARCHAR(191) NOT NULL,
        \`zip\` VARCHAR(20),
        \`distanceMiles\` DOUBLE,
        \`dogType\` VARCHAR(191),
        \`federation\` VARCHAR(191),
        \`eventType\` VARCHAR(191),
        \`membersCount\` INT DEFAULT 0,
        \`eventsCount\` INT DEFAULT 0,
        \`entriesCount\` INT DEFAULT 0,
        \`revenue\` DOUBLE DEFAULT 0.0,
        \`adminName\` VARCHAR(191),
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Event Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`Event\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL,
        \`federation\` VARCHAR(191) NOT NULL,
        \`sport\` VARCHAR(191),
        \`type\` VARCHAR(191) NOT NULL,
        \`club\` VARCHAR(191) NOT NULL,
        \`clubId\` VARCHAR(191) NOT NULL,
        \`state\` VARCHAR(191) NOT NULL,
        \`stateCode\` VARCHAR(10) NOT NULL,
        \`city\` VARCHAR(191) NOT NULL,
        \`date\` VARCHAR(50) NOT NULL,
        \`fee\` DOUBLE NOT NULL,
        \`entriesCount\` INT DEFAULT 0,
        \`maxCapacity\` INT DEFAULT 50,
        \`status\` VARCHAR(50) DEFAULT 'Registration Open',
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. EventEntry Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`EventEntry\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`eventId\` VARCHAR(191) NOT NULL,
        \`dogId\` VARCHAR(191),
        \`participant\` VARCHAR(191) NOT NULL,
        \`handlerPhone\` VARCHAR(50),
        \`fee\` DOUBLE NOT NULL,
        \`paymentStatus\` VARCHAR(50) DEFAULT 'Paid',
        \`confirmationCode\` VARCHAR(191) NOT NULL,
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. Product Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`Product\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL,
        \`price\` DOUBLE NOT NULL,
        \`category\` VARCHAR(191) NOT NULL,
        \`scopeChannel\` VARCHAR(50) DEFAULT 'NATIONAL',
        \`scopeEntity\` VARCHAR(191),
        \`organizationType\` VARCHAR(50),
        \`organizationId\` VARCHAR(191),
        \`profit\` DOUBLE DEFAULT 0.0,
        \`description\` TEXT,
        \`image\` VARCHAR(255),
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8. Order Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`Order\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`orderNumber\` VARCHAR(191) NOT NULL UNIQUE,
        \`customerName\` VARCHAR(191) NOT NULL,
        \`total\` DOUBLE NOT NULL,
        \`status\` VARCHAR(50) DEFAULT 'Completed',
        \`itemsJson\` TEXT,
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 9. DonationPledge Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`DonationPledge\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`entityType\` VARCHAR(50) NOT NULL,
        \`entityId\` VARCHAR(191) NOT NULL,
        \`amount\` DOUBLE NOT NULL,
        \`tier\` VARCHAR(191),
        \`cause\` VARCHAR(191),
        \`donorName\` VARCHAR(191),
        \`donorEmail\` VARCHAR(191),
        \`status\` VARCHAR(50) DEFAULT 'PENDING_GATEWAY',
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 10. FinancialTransaction Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`FinancialTransaction\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`type\` VARCHAR(50) NOT NULL,
        \`category\` VARCHAR(191) NOT NULL,
        \`amount\` DOUBLE NOT NULL,
        \`period\` VARCHAR(50),
        \`stateId\` VARCHAR(191),
        \`clubId\` VARCHAR(191),
        \`description\` TEXT,
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 11. News Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`News\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(191) NOT NULL,
        \`summary\` TEXT NOT NULL,
        \`category\` VARCHAR(191) NOT NULL,
        \`author\` VARCHAR(191) NOT NULL,
        \`date\` VARCHAR(50) NOT NULL,
        \`state\` VARCHAR(191),
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ All 11 MySQL Tables created successfully in `club` database!');

    // Seed Admin & Role Users with simple testing credentials (password: 12345678)
    const hash = bcrypt.hashSync('12345678', 10);
    const seedUsers = [
      ['usr-superadmin', 'superadmin@gmail.com', hash, 'Super Admin', 'SUPER_ADMIN', '(800) 555-0192', 'TX', 'club-1'],
      ['usr-nationaladmin', 'nationaladmin@gmail.com', hash, 'National Admin', 'NATIONAL_ADMIN', '(800) 555-0101', 'TX', 'club-1'],
      ['usr-stateadmin', 'stateadmin@gmail.com', hash, 'State Admin', 'STATE_ADMIN', '(865) 555-0100', 'TN', 'club-1'],
      ['usr-clubadmin', 'clubadmin@gmail.com', hash, 'Club Admin', 'CLUB_ADMIN', '(865) 555-0192', 'TN', 'club-1'],
      ['usr-eventadmin', 'eventadmin@gmail.com', hash, 'Event Admin', 'EVENT_ADMIN', '(865) 555-0155', 'TN', 'club-1'],
      ['usr-memberuser', 'member@gmail.com', hash, 'Member User', 'MEMBER', '(865) 555-0199', 'TN', 'club-1'],
      ['usr-demo', 'demo@example.com', hash, 'Demo Super Admin', 'SUPER_ADMIN', '(800) 555-0192', 'TX', 'club-1']
    ];

    for (const u of seedUsers) {
      await connection.query(`
        INSERT INTO \`User\` (\`id\`, \`email\`, \`passwordHash\`, \`name\`, \`role\`, \`phone\`, \`stateCode\`, \`clubId\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          \`passwordHash\`=VALUES(\`passwordHash\`),
          \`name\`=VALUES(\`name\`),
          \`role\`=VALUES(\`role\`),
          \`stateCode\`=VALUES(\`stateCode\`),
          \`clubId\`=VALUES(\`clubId\`);
      `, u);
    }

    // Seed State Associations (All 50 US States)
    const states = [
      ['al', 'Alabama State Association', 'AL', 'UKC', 'Marcus Vance', 15, 950, 4, 45000],
      ['ak', 'Alaska State Association', 'AK', 'PKC', 'Cody Campbell', 8, 420, 2, 18000],
      ['az', 'Arizona State Association', 'AZ', 'UKC,PKC', 'Frank Reynolds', 18, 1100, 5, 62000],
      ['ar', 'Arkansas State Association', 'AR', 'UKC', 'Dominic Rossi', 36, 2240, 6, 115000],
      ['ca', 'California State Association', 'CA', 'PKC', 'Elena Rostova', 31, 1980, 5, 98000],
      ['co', 'Colorado State Association', 'CO', 'PKC', 'Colorado Admin', 20, 1300, 6, 85000],
      ['ct', 'Connecticut State Association', 'CT', 'UKC', 'Connecticut Admin', 12, 750, 4, 48000],
      ['de', 'Delaware State Association', 'DE', 'PKC', 'Delaware Admin', 9, 520, 3, 35000],
      ['fl', 'Florida State Association', 'FL', 'UKC,PKC', 'Carlos Mendez', 27, 1760, 8, 122000],
      ['ga', 'Georgia State Association', 'GA', 'UKC,PKC', 'Georgia Admin', 33, 2200, 10, 148000],
      ['hi', 'Hawaii State Association', 'HI', 'UKC', 'Hawaii Admin', 5, 310, 2, 22000],
      ['id', 'Idaho State Association', 'ID', 'PKC', 'Idaho Admin', 16, 980, 5, 67000],
      ['il', 'Illinois State Association', 'IL', 'UKC,PKC', 'Illinois Admin', 36, 2350, 12, 158000],
      ['in', 'Indiana State Association', 'IN', 'UKC,PKC', 'Indiana Admin', 34, 2250, 11, 152000],
      ['ia', 'Iowa State Association', 'IA', 'UKC', 'Iowa Admin', 25, 1600, 8, 105000],
      ['ks', 'Kansas State Association', 'KS', 'PKC', 'Kansas Admin', 21, 1400, 7, 90000],
      ['ky', 'Kentucky State Association', 'KY', 'UKC,PKC', 'Thomas Shelby', 38, 2190, 11, 142100],
      ['la', 'Louisiana State Association', 'LA', 'UKC,PKC', 'Louisiana Admin', 26, 1700, 8, 115000],
      ['me', 'Maine State Association', 'ME', 'UKC', 'Maine Admin', 14, 880, 4, 58000],
      ['md', 'Maryland State Association', 'MD', 'PKC', 'Maryland Admin', 19, 1200, 6, 82000],
      ['ma', 'Massachusetts State Association', 'MA', 'UKC', 'Massachusetts Admin', 15, 960, 5, 64000],
      ['mi', 'Michigan State Association', 'MI', 'UKC,PKC', 'Michigan Admin', 40, 2600, 13, 175000],
      ['mn', 'Minnesota State Association', 'MN', 'UKC', 'Minnesota Admin', 28, 1800, 9, 120000],
      ['ms', 'Mississippi State Association', 'MS', 'UKC,PKC', 'Mississippi Admin', 23, 1500, 7, 98000],
      ['mo', 'Missouri State Association', 'MO', 'UKC,PKC', 'Missouri Admin', 35, 2300, 11, 155000],
      ['mt', 'Montana State Association', 'MT', 'PKC', 'Montana Admin', 13, 820, 4, 54000],
      ['ne', 'Nebraska State Association', 'NE', 'UKC', 'Nebraska Admin', 17, 1050, 5, 70000],
      ['nv', 'Nevada State Association', 'NV', 'PKC', 'Nevada Admin', 11, 680, 4, 45000],
      ['nh', 'New Hampshire State Association', 'NH', 'UKC', 'New Hampshire Admin', 10, 600, 3, 40000],
      ['nj', 'New Jersey State Association', 'NJ', 'PKC', 'New Jersey Admin', 20, 1250, 6, 84000],
      ['nm', 'New Mexico State Association', 'NM', 'UKC', 'New Mexico Admin', 14, 890, 4, 59000],
      ['ny', 'New York State Association', 'NY', 'UKC,PKC', 'Dominic Rossi', 24, 1540, 7, 110000],
      ['nc', 'North Carolina State Association', 'NC', 'UKC,PKC', 'Lucas Scott', 35, 2410, 14, 165000],
      ['nd', 'North Dakota State Association', 'ND', 'PKC', 'North Dakota Admin', 9, 540, 3, 36000],
      ['oh', 'Ohio State Association', 'OH', 'UKC,PKC', 'Jack Crawford', 48, 3120, 16, 205000],
      ['ok', 'Oklahoma State Association', 'OK', 'UKC,PKC', 'Oklahoma Admin', 24, 1550, 7, 102000],
      ['or', 'Oregon State Association', 'OR', 'UKC', 'Oregon Admin', 19, 1220, 6, 81000],
      ['pa', 'Pennsylvania State Association', 'PA', 'UKC,PKC', 'Pennsylvania Admin', 37, 2450, 12, 162000],
      ['ri', 'Rhode Island State Association', 'RI', 'UKC', 'Rhode Island Admin', 6, 380, 2, 25000],
      ['sc', 'South Carolina State Association', 'SC', 'UKC,PKC', 'South Carolina Admin', 28, 1820, 9, 121000],
      ['sd', 'South Dakota State Association', 'SD', 'PKC', 'South Dakota Admin', 11, 690, 4, 46000],
      ['tn', 'Tennessee State Association', 'TN', 'UKC,PKC', 'Sarah Tennessee', 42, 2890, 8, 185000],
      ['tx', 'Texas Hound Association', 'TX', 'UKC,PKC', 'Austin Sterling', 54, 3920, 7, 245000],
      ['ut', 'Utah State Association', 'UT', 'PKC', 'Utah Admin', 15, 970, 5, 66000],
      ['vt', 'Vermont State Association', 'VT', 'UKC', 'Vermont Admin', 8, 490, 3, 33000],
      ['va', 'Virginia State Association', 'VA', 'UKC,PKC', 'Rachel Green', 29, 1850, 8, 118400],
      ['wa', 'Washington State Association', 'WA', 'UKC', 'Washington Admin', 22, 1420, 7, 94000],
      ['wv', 'West Virginia State Association', 'WV', 'UKC,PKC', 'West Virginia Admin', 21, 1380, 6, 91000],
      ['wi', 'Wisconsin State Association', 'WI', 'UKC,PKC', 'Wisconsin Admin', 32, 2100, 10, 140000],
      ['wy', 'Wyoming State Association', 'WY', 'PKC', 'Wyoming Admin', 10, 610, 3, 41000]
    ];

    for (const s of states) {
      await connection.query(
        `INSERT INTO \`StateAssociation\` (\`id\`, \`name\`, \`code\`, \`organizations\`, \`adminName\`, \`clubsCount\`, \`membersCount\`, \`eventsCount\`, \`revenue\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`code\`=VALUES(\`code\`), \`organizations\`=VALUES(\`organizations\`), \`adminName\`=VALUES(\`adminName\`), \`clubsCount\`=VALUES(\`clubsCount\`), \`membersCount\`=VALUES(\`membersCount\`), \`eventsCount\`=VALUES(\`eventsCount\`), \`revenue\`=VALUES(\`revenue\`);`,
        s
      );
    }

    // Seed Local Clubs
    const clubs = [
      ['club-1', 'Oak Ridge Hunting Club', 'Knoxville', 'Knox County', 'Tennessee', 'TN', 'tn', '37901', 18, 'Treeing Walker Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 84, 6, 217, 6790, 'Robert Miller'],
      ['club-2', 'Cumberland Mountain Club', 'Middlesboro', 'Bell County', 'Kentucky', 'KY', 'ky', '40965', 64, 'English Redtick Coonhound', 'AKC (American Kennel Club)', 'Water Race', 96, 8, 304, 8940, 'Thomas Shelby'],
      ['club-tx-central', 'Central Texas Hound Club', 'Waco', 'McLennan County', 'Texas', 'TX', 'tx', '76701', 20, 'Treeing Walker Coonhound', 'Independent', 'Bench Show', 82, 6, 225, 8700, 'Caleb Vance']
    ];

    for (const c of clubs) {
      await connection.query(
        `INSERT INTO \`LocalClub\` (\`id\`, \`name\`, \`city\`, \`county\`, \`state\`, \`stateCode\`, \`stateId\`, \`zip\`, \`distanceMiles\`, \`dogType\`, \`federation\`, \`eventType\`, \`membersCount\`, \`eventsCount\`, \`entriesCount\`, \`revenue\`, \`adminName\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);`,
        c
      );
    }

    // Seed Events
    const events = [
      ['evt-1', 'Nite Hunt & Treeing Contest', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'September 19, 2026', 30.0, 43, 50, 'Registration Open'],
      ['evt-2', 'Fall Championship Hunt', 'PKC (Professional Kennel Club)', 'Coonhounds', 'Championship Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'October 24, 2026', 45.0, 28, 60, 'Registration Open']
    ];

    for (const e of events) {
      await connection.query(
        `INSERT INTO \`Event\` (\`id\`, \`name\`, \`federation\`, \`sport\`, \`type\`, \`club\`, \`clubId\`, \`state\`, \`stateCode\`, \`city\`, \`date\`, \`fee\`, \`entriesCount\`, \`maxCapacity\`, \`status\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);`,
        e
      );
    }

    console.log('🎉 Seed data successfully inserted into MySQL `club` database in phpMyAdmin!');
    await connection.end();

  } catch (err) {
    console.error('❌ MySQL Setup Error:', err.message);
  }
}

setupMySQL();
