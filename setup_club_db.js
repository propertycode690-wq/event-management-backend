const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'prisma', 'club.db');
console.log('📦 Creating `club.db` database and all 11 tables at:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. User Table
  db.run(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'MEMBER',
      phone TEXT,
      stateCode TEXT,
      clubId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Member Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Member (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      state TEXT,
      club TEXT,
      status TEXT DEFAULT 'Active',
      duesAmount REAL DEFAULT 35.0,
      joinDate TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. StateAssociation Table
  db.run(`
    CREATE TABLE IF NOT EXISTS StateAssociation (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      organizations TEXT DEFAULT 'UKC,PKC',
      adminName TEXT,
      clubsCount INTEGER DEFAULT 0,
      membersCount INTEGER DEFAULT 0,
      eventsCount INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0.0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. LocalClub Table
  db.run(`
    CREATE TABLE IF NOT EXISTS LocalClub (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      county TEXT,
      state TEXT NOT NULL,
      stateCode TEXT NOT NULL,
      stateId TEXT NOT NULL,
      zip TEXT,
      distanceMiles REAL,
      dogType TEXT,
      federation TEXT,
      eventType TEXT,
      membersCount INTEGER DEFAULT 0,
      eventsCount INTEGER DEFAULT 0,
      entriesCount INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0.0,
      adminName TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Event Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Event (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      federation TEXT NOT NULL,
      sport TEXT,
      type TEXT NOT NULL,
      club TEXT NOT NULL,
      clubId TEXT NOT NULL,
      state TEXT NOT NULL,
      stateCode TEXT NOT NULL,
      city TEXT NOT NULL,
      date TEXT NOT NULL,
      fee REAL NOT NULL,
      entriesCount INTEGER DEFAULT 0,
      maxCapacity INTEGER DEFAULT 50,
      status TEXT DEFAULT 'Registration Open',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. EventEntry Table
  db.run(`
    CREATE TABLE IF NOT EXISTS EventEntry (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      dogId TEXT,
      participant TEXT NOT NULL,
      handlerPhone TEXT,
      fee REAL NOT NULL,
      paymentStatus TEXT DEFAULT 'Paid',
      confirmationCode TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Product Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Product (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      scopeChannel TEXT DEFAULT 'NATIONAL',
      scopeEntity TEXT,
      organizationType TEXT,
      organizationId TEXT,
      profit REAL DEFAULT 0.0,
      description TEXT,
      image TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. StoreOrder Table (Escaped for SQLite Keyword)
  db.run(`
    CREATE TABLE IF NOT EXISTS [Order] (
      id TEXT PRIMARY KEY,
      orderNumber TEXT UNIQUE NOT NULL,
      customerName TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'Completed',
      itemsJson TEXT DEFAULT '[]',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. DonationPledge Table
  db.run(`
    CREATE TABLE IF NOT EXISTS DonationPledge (
      id TEXT PRIMARY KEY,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      amount REAL NOT NULL,
      tier TEXT,
      cause TEXT,
      donorName TEXT,
      donorEmail TEXT,
      status TEXT DEFAULT 'PENDING_GATEWAY',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 10. FinancialTransaction Table
  db.run(`
    CREATE TABLE IF NOT EXISTS FinancialTransaction (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT,
      stateId TEXT,
      clubId TEXT,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 11. News Table
  db.run(`
    CREATE TABLE IF NOT EXISTS News (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      category TEXT NOT NULL,
      author TEXT NOT NULL,
      date TEXT NOT NULL,
      state TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ All 11 Tables created successfully in `club.db`!');

  // Seed Admin User
  const hash = bcrypt.hashSync('Password123!', 10);
  db.run(`
    INSERT OR REPLACE INTO User (id, email, passwordHash, name, role, phone, stateCode, clubId)
    VALUES ('usr-lalit', 'demo@example.com', '${hash}', 'Lalit Panchole', 'SUPER_ADMIN', '(800) 555-0192', 'TX', 'club-1')
  `);

  // Seed State Associations
  const states = [
    ['tx', 'Texas Hound Association', 'TX', 'UKC,PKC', 'Austin Sterling', 54, 3920, 7, 245000],
    ['al', 'Alabama State Association', 'AL', 'UKC', 'Marcus Vance', 15, 950, 4, 45000],
    ['ak', 'Alaska State Association', 'AK', 'PKC', 'Cody Campbell', 8, 420, 2, 18000],
    ['az', 'Arizona State Association', 'AZ', 'UKC,PKC', 'Frank Reynolds', 18, 1100, 5, 62000],
    ['ar', 'Arkansas State Association', 'AR', 'UKC', 'Dominic Rossi', 36, 2240, 6, 115000],
    ['ca', 'California State Association', 'CA', 'PKC', 'Elena Rostova', 31, 1980, 5, 98000],
    ['tn', 'Tennessee State Association', 'TN', 'UKC,PKC', 'Robert Miller', 42, 2890, 8, 185000]
  ];

  const stmtState = db.prepare(`
    INSERT OR REPLACE INTO StateAssociation (id, name, code, organizations, adminName, clubsCount, membersCount, eventsCount, revenue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of states) {
    stmtState.run(s);
  }
  stmtState.finalize();

  // Seed Local Clubs
  const clubs = [
    ['club-1', 'Oak Ridge Hunting Club', 'Knoxville', 'Knox County', 'Tennessee', 'TN', 'tn', '37901', 18, 'Treeing Walker Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 84, 6, 217, 6790, 'Robert Miller'],
    ['club-2', 'Cumberland Mountain Club', 'Middlesboro', 'Bell County', 'Kentucky', 'KY', 'ky', '40965', 64, 'English Redtick Coonhound', 'AKC (American Kennel Club)', 'Water Race', 96, 8, 304, 8940, 'Thomas Shelby'],
    ['club-tx-central', 'Central Texas Hound Club', 'Waco', 'McLennan County', 'Texas', 'TX', 'tx', '76701', 20, 'Treeing Walker Coonhound', 'Independent', 'Bench Show', 82, 6, 225, 8700, 'Caleb Vance']
  ];

  const stmtClub = db.prepare(`
    INSERT OR REPLACE INTO LocalClub (id, name, city, county, state, stateCode, stateId, zip, distanceMiles, dogType, federation, eventType, membersCount, eventsCount, entriesCount, revenue, adminName)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of clubs) {
    stmtClub.run(c);
  }
  stmtClub.finalize();

  // Seed Events
  const events = [
    ['evt-1', 'Nite Hunt & Treeing Contest', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'September 19, 2026', 30.0, 43, 50, 'Registration Open'],
    ['evt-2', 'Fall Championship Hunt', 'PKC (Professional Kennel Club)', 'Coonhounds', 'Championship Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'October 24, 2026', 45.0, 28, 60, 'Registration Open']
  ];

  const stmtEvt = db.prepare(`
    INSERT OR REPLACE INTO Event (id, name, federation, sport, type, club, clubId, state, stateCode, city, date, fee, entriesCount, maxCapacity, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const e of events) {
    stmtEvt.run(e);
  }
  stmtEvt.finalize();

  console.log('🎉 Seed data successfully inserted into `club.db` database!');
});

db.close();
