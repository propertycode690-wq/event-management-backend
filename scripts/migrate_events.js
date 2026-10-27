const db = require('../db');

async function migrate() {
  try {
    try {
      await db.query(`
        ALTER TABLE Event 
        ADD COLUMN deadline VARCHAR(191) NULL DEFAULT 'Sep 18, 2026',
        ADD COLUMN address VARCHAR(255) NULL DEFAULT '1420 Hunting Ridge Rd, Knoxville, TN 37901',
        ADD COLUMN description TEXT NULL,
        ADD COLUMN startTime VARCHAR(50) NULL DEFAULT '7:00 PM'
      `);
      console.log('✅ Added missing columns to Event table');
    } catch (err) {
      console.log('Columns might already exist:', err.message);
    }

    await db.query(`
      UPDATE Event 
      SET deadline = 'Sep 18, 2026', 
          address = '1420 Hunting Ridge Rd, Knoxville, TN 37901', 
          description = 'Annual night coon hunt and treeing championship. UKC rules apply. Trophies for top 5 hounds.', 
          startTime = '7:00 PM' 
      WHERE id = 'evt-1'
    `);

    await db.query(`
      UPDATE Event 
      SET deadline = 'Oct 23, 2026', 
          address = '880 River Road, Knoxville, TN 37920', 
          description = 'Official PKC Sanctioned Fall Championship Hunt. Top hounds qualify for national finals.', 
          startTime = '6:30 PM' 
      WHERE id = 'evt-2'
    `);

    console.log('✅ Successfully updated Event details in database');
    const [rows] = await db.query('SELECT id, name, deadline, address, description, startTime FROM Event');
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
