/**
 * Dedicated Local Test Database Schema & Fixture Manager
 * Ensures zero connectivity to Railway / staging / production database.
 */

const bcrypt = require('bcryptjs');

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS User (
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
  )`,
  `CREATE TABLE IF NOT EXISTS Member (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    state TEXT,
    club TEXT,
    status TEXT DEFAULT 'Pending Payment Verification',
    duesAmount REAL DEFAULT 35.0,
    joinDate TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS StateAssociation (
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
  )`,
  `CREATE TABLE IF NOT EXISTS LocalClub (
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
  )`,
  `CREATE TABLE IF NOT EXISTS Event (
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
    deadline TEXT,
    address TEXT,
    description TEXT,
    startTime TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS EventEntry (
    id TEXT PRIMARY KEY,
    eventId TEXT NOT NULL,
    dogId TEXT,
    participant TEXT NOT NULL,
    handlerPhone TEXT,
    fee REAL NOT NULL,
    paymentStatus TEXT DEFAULT 'Paid',
    confirmationCode TEXT NOT NULL,
    checkInStatus TEXT DEFAULT 'Not Arrived',
    checkedInAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS CompetitionResult (
    id TEXT PRIMARY KEY,
    eventId TEXT,
    eventName TEXT NOT NULL,
    club TEXT,
    state TEXT,
    stateCode TEXT,
    placement TEXT,
    place INTEGER,
    winnerDog TEXT,
    winnerDogReg TEXT,
    breed TEXT,
    owner TEXT,
    participant TEXT,
    score TEXT,
    date TEXT,
    status TEXT DEFAULT 'Published',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ClubClaim (
    id TEXT PRIMARY KEY,
    club TEXT NOT NULL,
    state TEXT,
    applicant TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    submittedDate TEXT,
    claimStatus TEXT DEFAULT 'Pending',
    verificationStatus TEXT DEFAULT 'Pending Review',
    message TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS Product (
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
  )`,
  `CREATE TABLE IF NOT EXISTS \`Order\` (
    id TEXT PRIMARY KEY,
    orderNumber TEXT UNIQUE NOT NULL,
    customerName TEXT NOT NULL,
    customerEmail TEXT,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Processing',
    fulfillmentStatus TEXT DEFAULT 'Processing',
    trackingNumber TEXT DEFAULT 'Pending Dispatch',
    carrier TEXT DEFAULT 'UPS Ground',
    payoutStatus TEXT DEFAULT 'Pending',
    clubId TEXT,
    itemsJson TEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS DonationPledge (
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
  )`,
  `CREATE TABLE IF NOT EXISTS FinancialTransaction (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT,
    stateId TEXT,
    clubId TEXT,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS News (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL,
    author TEXT NOT NULL,
    date TEXT NOT NULL,
    state TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

async function initializeTestSchema(db) {
  for (const statement of SCHEMA_SQL) {
    await db.query(statement);
  }
  // Ensure columns exist if table was previously created
  try {
    await db.query("ALTER TABLE EventEntry ADD COLUMN checkInStatus TEXT DEFAULT 'Not Arrived'");
  } catch (e) {
    // column already exists
  }
  try {
    await db.query("ALTER TABLE EventEntry ADD COLUMN checkedInAt DATETIME");
  } catch (e) {
    // column already exists
  }
  // Phase 7 migrations for Order fulfillment and payout persistence
  try {
    await db.query("ALTER TABLE `Order` ADD COLUMN customerEmail TEXT");
  } catch (e) {}
  try {
    await db.query("ALTER TABLE `Order` ADD COLUMN fulfillmentStatus TEXT DEFAULT 'Processing'");
  } catch (e) {}
  try {
    await db.query("ALTER TABLE `Order` ADD COLUMN trackingNumber TEXT DEFAULT 'Pending Dispatch'");
  } catch (e) {}
  try {
    await db.query("ALTER TABLE `Order` ADD COLUMN carrier TEXT DEFAULT 'UPS Ground'");
  } catch (e) {}
  try {
    await db.query("ALTER TABLE `Order` ADD COLUMN payoutStatus TEXT DEFAULT 'Pending'");
  } catch (e) {}
  try {
    await db.query("ALTER TABLE `Order` ADD COLUMN clubId TEXT");
  } catch (e) {}
}

async function seedTestFixtures(db) {
  // Clear any previous records
  const tables = ['User', 'Member', 'StateAssociation', 'LocalClub', 'Event', 'EventEntry', 'ClubClaim', 'Product', '`Order`', 'DonationPledge', 'FinancialTransaction', 'News', 'CompetitionResult'];
  for (const t of tables) {
    await db.query(`DELETE FROM ${t}`);
  }

  const hash = bcrypt.hashSync('Password123!', 10);

  // 1. Users (Standard Test Fixtures)
  await db.query(
    `INSERT INTO User (id, email, passwordHash, name, role, phone, stateCode, clubId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['usr-super-admin', 'superadmin@example.com', hash, 'Super Admin', 'SUPER_ADMIN', '(555) 000-0001', 'ALL', 'national']
  );

  await db.query(
    `INSERT INTO User (id, email, passwordHash, name, role, phone, stateCode, clubId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['usr-regular-member', 'member@example.com', hash, 'Regular Member', 'MEMBER', '(555) 000-0002', 'TN', 'club-1']
  );

  await db.query(
    `INSERT INTO User (id, email, passwordHash, name, role, phone, stateCode, clubId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['usr-state-admin', 'stateadmin@example.com', hash, 'Texas State Admin', 'STATE_ADMIN', '(555) 000-0003', 'TX', null]
  );

  await db.query(
    `INSERT INTO User (id, email, passwordHash, name, role, phone, stateCode, clubId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['usr-club-admin', 'clubadmin@example.com', hash, 'Oak Ridge Club Admin', 'CLUB_ADMIN', '(555) 000-0004', 'TN', 'club-1']
  );

  // Quick-Fill UI Accounts (Password: 12345678)
  const qfHash = await bcrypt.hash('12345678', 10);
  const qfUsers = [
    ['usr-qf-super', 'superadmin@gmail.com', qfHash, 'Super Admin', 'SUPER_ADMIN', '(555) 019-2834', 'TX', 'club-1'],
    ['usr-qf-national', 'nationaladmin@gmail.com', qfHash, 'National Admin', 'NATIONAL_ADMIN', '(555) 019-2834', 'TX', 'club-1'],
    ['usr-qf-state', 'stateadmin@gmail.com', qfHash, 'Texas State Admin', 'STATE_ADMIN', '(555) 019-2834', 'TX', 'club-1'],
    ['usr-qf-club', 'clubadmin@gmail.com', qfHash, 'Club Admin', 'CLUB_ADMIN', '(555) 019-2834', 'TX', 'club-1'],
    ['usr-qf-event', 'eventadmin@gmail.com', qfHash, 'Event Coordinator', 'EVENT_ADMIN', '(555) 019-2834', 'TX', 'club-1'],
    ['usr-qf-member', 'member@gmail.com', qfHash, 'Active Member', 'MEMBER', '(555) 019-2834', 'TX', 'club-1']
  ];
  for (const qf of qfUsers) {
    await db.query(
      `INSERT OR IGNORE INTO User (id, email, passwordHash, name, role, phone, stateCode, clubId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      qf
    );
  }

  // 2. States
  await db.query(
    `INSERT INTO StateAssociation (id, name, code, organizations, adminName, clubsCount, membersCount, eventsCount, revenue)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['state-tx', 'Texas Hound Association', 'TX', 'UKC,PKC', 'Texas Admin', 54, 3920, 7, 245000]
  );

  await db.query(
    `INSERT INTO StateAssociation (id, name, code, organizations, adminName, clubsCount, membersCount, eventsCount, revenue)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['state-tn', 'Tennessee State Association', 'TN', 'UKC,PKC', 'Tennessee Admin', 42, 2890, 8, 185000]
  );

  await db.query(
    `INSERT INTO StateAssociation (id, name, code, organizations, adminName, clubsCount, membersCount, eventsCount, revenue)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['state-ky', 'Kentucky State Association', 'KY', 'AKC', 'Kentucky Admin', 12, 600, 3, 40000]
  );

  // 3. Local Clubs
  await db.query(
    `INSERT INTO LocalClub (id, name, city, county, state, stateCode, stateId, zip, membersCount, eventsCount, entriesCount, revenue, adminName)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['club-1', 'Oak Ridge Hunting Club', 'Knoxville', 'Knox County', 'Tennessee', 'TN', 'state-tn', '37901', 84, 6, 217, 6790, 'Oak Ridge Admin']
  );

  await db.query(
    `INSERT INTO LocalClub (id, name, city, county, state, stateCode, stateId, zip, membersCount, eventsCount, entriesCount, revenue, adminName)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['club-2', 'Cumberland Mountain Club', 'Middlesboro', 'Bell County', 'Kentucky', 'KY', 'state-ky', '40965', 96, 8, 304, 8940, 'Cumberland Admin']
  );

  await db.query(
    `INSERT INTO LocalClub (id, name, city, county, state, stateCode, stateId, zip, membersCount, eventsCount, entriesCount, revenue, adminName)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['club-tx-1', 'Lone Star Hound Club', 'Austin', 'Travis County', 'Texas', 'TX', 'state-tx', '78701', 50, 4, 120, 4500, 'Texas Admin']
  );


  // 4. Events (one in club-1, one in club-2)
  await db.query(
    `INSERT INTO Event (id, name, federation, sport, type, club, clubId, state, stateCode, city, date, fee, entriesCount, maxCapacity, status, deadline, address, description, startTime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['evt-1', 'Oak Ridge Championship Hunt', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'September 19, 2026', 30.0, 10, 50, 'Registration Open', 'Sep 18, 2026', '1420 Hunting Ridge Rd', 'Sanctioned night hunt.', '7:00 PM']
  );

  await db.query(
    `INSERT INTO Event (id, name, federation, sport, type, club, clubId, state, stateCode, city, date, fee, entriesCount, maxCapacity, status, deadline, address, description, startTime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['evt-2', 'Cumberland Mountain Field Trial', 'AKC (American Kennel Club)', 'Coonhounds', 'Field Trial', 'Cumberland Mountain Club', 'club-2', 'Kentucky', 'KY', 'Middlesboro', 'October 24, 2026', 45.0, 5, 40, 'Registration Open', 'Oct 23, 2026', '880 River Road', 'Cumberland trial event.', '6:30 PM']
  );

  // 5. Members (one in TN, one in TX, one in KY)
  await db.query(
    `INSERT INTO Member (id, name, email, phone, state, club, status, duesAmount, joinDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['mem-tn', 'Tennessee Member', 'tn.member@example.com', '(555) 111-1111', 'Tennessee', 'Oak Ridge Hunting Club', 'Active', 35.0, 'Jan 01, 2026']
  );

  await db.query(
    `INSERT INTO Member (id, name, email, phone, state, club, status, duesAmount, joinDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['mem-tx', 'Texas Member', 'tx.member@example.com', '(555) 222-2222', 'Texas', 'Central Texas Hound Club', 'Active', 35.0, 'Feb 01, 2026']
  );

  await db.query(
    `INSERT INTO Member (id, name, email, phone, state, club, status, duesAmount, joinDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['mem-ky', 'Kentucky Member', 'ky.member@example.com', '(555) 333-3333', 'Kentucky', 'Cumberland Mountain Club', 'Pending Payment Verification', 35.0, 'Mar 01, 2026']
  );

  // 6. Club Claim
  await db.query(
    `INSERT INTO ClubClaim (id, club, state, applicant, email, phone, submittedDate, claimStatus, verificationStatus, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['CLM-501', 'Hawaii State Association', 'HI', 'James Wadley', 'Houstonroofing@yahoo.com', '(713) 555-0192', 'Oct 23, 2026', 'Pending', 'Pending Verification', 'Official state association administration claim.']
  );

  // 7. Event Entries (ent-1 in evt-1 / club-1, ent-2 in evt-2 / club-2)
  await db.query(
    `INSERT INTO EventEntry (id, eventId, dogId, participant, handlerPhone, fee, paymentStatus, confirmationCode, checkInStatus, checkedInAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ent-1', 'evt-1', 'dog-101', 'John Walker', '(865) 555-0101', 30.0, 'Pending Payment', 'UHC-100001', 'Not Arrived', null]
  );

  await db.query(
    `INSERT INTO EventEntry (id, eventId, dogId, participant, handlerPhone, fee, paymentStatus, confirmationCode, checkInStatus, checkedInAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ent-2', 'evt-2', 'dog-102', 'Thomas Shelby', '(606) 555-0202', 45.0, 'Paid', 'UHC-100002', 'Not Arrived', null]
  );

  // 8. Competition Results
  await db.query(
    `INSERT INTO CompetitionResult (id, eventId, eventName, club, state, stateCode, placement, place, winnerDog, winnerDogReg, breed, owner, participant, score, date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['res-1', 'evt-1', 'Oak Ridge Championship Hunt', 'Oak Ridge Hunting Club', 'Tennessee', 'TN', '1st Place', 1, "Thunder's Southern Belle", 'UKC-892401', 'Treeing Walker Coonhound', 'Lalit Panchole', 'Lalit Panchole', '375 Pts', 'Sep 19, 2026', 'Published']
  );

  await db.query(
    `INSERT INTO CompetitionResult (id, eventId, eventName, club, state, stateCode, placement, place, winnerDog, winnerDogReg, breed, owner, participant, score, date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['res-2', 'evt-2', 'Cumberland Mountain Field Trial', 'Cumberland Mountain Club', 'Kentucky', 'KY', '1st Place', 1, 'Blue Ridge Midnight Rambler', 'PKC-441092', 'Bluetick Coonhound', 'Lalit Panchole', 'Lalit Panchole', '325 Pts', 'Sep 12, 2026', 'Published']
  );

  // 9. Orders
  await db.query(
    `INSERT INTO \`Order\` (id, orderNumber, customerName, customerEmail, total, status, fulfillmentStatus, trackingNumber, carrier, payoutStatus, clubId, itemsJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ord-1', 'ORD-9001', 'Regular Member', 'member@example.com', 89.99, 'Processing', 'Processing', 'Pending Dispatch', 'UPS Ground', 'Pending', 'club-1', '[{"name":"Oak Ridge Cap","quantity":1,"price":89.99}]']
  );

  await db.query(
    `INSERT INTO \`Order\` (id, orderNumber, customerName, customerEmail, total, status, fulfillmentStatus, trackingNumber, carrier, payoutStatus, clubId, itemsJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ord-2', 'ORD-9002', 'Kentucky Member', 'ky.member@example.com', 145.50, 'Shipped', 'Shipped', '1Z9999999999999991', 'UPS Ground', 'Approved', 'club-2', '[{"name":"Tracking Collar","quantity":1,"price":145.50}]']
  );
}

module.exports = {
  initializeTestSchema,
  seedTestFixtures
};
