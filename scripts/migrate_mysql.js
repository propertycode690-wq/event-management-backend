const mysql = require('mysql2/promise');

async function run() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'club'
    });
    console.log('Connected to local MySQL club');

    // 1. Add missing columns to EventEntry
    try {
      await pool.query("ALTER TABLE EventEntry ADD COLUMN checkInStatus VARCHAR(50) DEFAULT 'Not Arrived'");
      console.log('Added checkInStatus column to EventEntry');
    } catch (e) {
      console.log('checkInStatus note:', e.message);
    }

    try {
      await pool.query("ALTER TABLE EventEntry ADD COLUMN checkedInAt DATETIME DEFAULT NULL");
      console.log('Added checkedInAt column to EventEntry');
    } catch (e) {
      console.log('checkedInAt note:', e.message);
    }

    // 2. Create CompetitionResult table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS CompetitionResult (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        eventId VARCHAR(191) DEFAULT NULL,
        eventName VARCHAR(191) NOT NULL,
        club VARCHAR(191) DEFAULT NULL,
        state VARCHAR(191) DEFAULT NULL,
        stateCode VARCHAR(10) DEFAULT NULL,
        placement VARCHAR(50) DEFAULT NULL,
        place INT DEFAULT 1,
        winnerDog VARCHAR(191) NOT NULL,
        winnerDogReg VARCHAR(191) DEFAULT NULL,
        breed VARCHAR(191) DEFAULT 'Coonhound',
        owner VARCHAR(191) DEFAULT NULL,
        participant VARCHAR(191) NOT NULL,
        score VARCHAR(50) DEFAULT '0 Pts',
        date VARCHAR(50) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'Published',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('CompetitionResult table verified in MySQL club database!');

    // 3. Seed initial sample results if empty
    const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM CompetitionResult');
    if (existing[0]?.cnt === 0) {
      await pool.query(`
        INSERT INTO CompetitionResult
          (id, eventId, eventName, club, state, stateCode, placement, place, winnerDog, winnerDogReg, breed, owner, participant, score, date, status)
        VALUES
          ('res-1', 'evt-1', 'Great Smoky Mountain Classic Coon Hunt', 'Oak Ridge Hunting Club', 'Tennessee', 'TN', '#1 Place', 1, 'Smoky Mountain Blue', 'UKC-CH-98124', 'Treeing Walker Coonhound', 'Lalit Panchole', 'Lalit Panchole', '450 Pts', 'Oct 15, 2026', 'Published'),
          ('res-2', 'evt-1', 'Great Smoky Mountain Classic Coon Hunt', 'Oak Ridge Hunting Club', 'Tennessee', 'TN', '#2 Place', 2, 'Dixie Rebel Belle', 'UKC-GRNTCH-44129', 'Bluetick Coonhound', 'Marcus Vance', 'Marcus Vance', '375 Pts', 'Oct 15, 2026', 'Published'),
          ('res-3', 'evt-2', 'Bluegrass Regional Championship Hunt', 'Bluegrass Coonhound Association', 'Kentucky', 'KY', '#1 Place', 1, 'Timber Creek Jack', 'UKC-PR-77123', 'Black and Tan Coonhound', 'Cody Campbell', 'Cody Campbell', '425 Pts', 'Oct 22, 2026', 'Published')
      `);
      console.log('Sample competition results seeded successfully in MySQL club!');
    } else {
      console.log(`Found ${existing[0]?.cnt} existing competition results in MySQL.`);
    }

    await pool.end();
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

run();
