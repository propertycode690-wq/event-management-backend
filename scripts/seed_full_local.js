process.env.USE_LOCAL_SQLITE = 'true';
const path = require('path');
const db = require(path.resolve('c:/Users/admin/Desktop/98645312/Events/backend/db'));
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Seeding local-dev.sqlite with complete test fixtures...');

  // 1. States
  const states = [
    ['state-tn', 'Tennessee State Association', 'TN', 'UKC,PKC', 'Tennessee Admin', 42, 2890, 8, 185000],
    ['state-tx', 'Texas Hound Association', 'TX', 'UKC,PKC', 'Texas Admin', 54, 3920, 7, 245000],
    ['state-ky', 'Kentucky State Association', 'KY', 'AKC', 'Kentucky Admin', 12, 600, 3, 40000],
    ['state-hi', 'Hawaii State Association', 'HI', 'UKC', 'Hawaii Admin', 8, 380, 2, 25000]
  ];
  for (const s of states) {
    await db.query(
      `INSERT OR REPLACE INTO StateAssociation (id, name, code, organizations, adminName, clubsCount, membersCount, eventsCount, revenue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      s
    );
  }
  console.log('States seeded successfully.');

  // 2. Clubs
  const clubs = [
    ['club-1', 'Oak Ridge Hunting Club', 'Knoxville', 'Knox County', 'Tennessee', 'TN', 'state-tn', '37901', 84, 6, 217, 6790, 'Oak Ridge Admin'],
    ['club-2', 'Cumberland Mountain Club', 'Middlesboro', 'Bell County', 'Kentucky', 'KY', 'state-ky', '40965', 96, 8, 304, 8940, 'Cumberland Admin'],
    ['club-tx-1', 'Lone Star Hound Club', 'Austin', 'Travis County', 'Texas', 'TX', 'state-tx', '78701', 50, 4, 120, 4500, 'Texas Admin'],
    ['club-tx-2', 'Houston County Coon Hunters Association', 'Crockett', 'Houston County', 'Texas', 'TX', 'state-tx', '75835', 88, 5, 140, 5200, 'Houston Admin'],
    ['club-hi-1', 'Honolulu Hound & Hunting Club', 'Honolulu', 'Honolulu County', 'Hawaii', 'HI', 'state-hi', '96813', 38, 2, 60, 2100, 'Honolulu Admin']
  ];
  for (const c of clubs) {
    await db.query(
      `INSERT OR REPLACE INTO LocalClub (id, name, city, county, state, stateCode, stateId, zip, membersCount, eventsCount, entriesCount, revenue, adminName)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c
    );
  }
  console.log('Clubs seeded successfully.');

  // 3. Events
  const events = [
    ['evt-1', 'Oak Ridge Championship Hunt', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'September 19, 2026', 30.0, 10, 50, 'Registration Open', 'Sep 18, 2026', '1420 Hunting Ridge Rd', 'Annual night coon hunt and treeing championship. UKC rules apply.', '7:00 PM'],
    ['evt-2', 'Cumberland Mountain Field Trial', 'AKC (American Kennel Club)', 'Coonhounds', 'Field Trial', 'Cumberland Mountain Club', 'club-2', 'Kentucky', 'KY', 'Middlesboro', 'October 24, 2026', 45.0, 5, 40, 'Registration Open', 'Oct 23, 2026', '880 River Road', 'Cumberland trial event.', '6:30 PM'],
    ['evt-3', 'Lone Star State Coonhound Classic', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Lone Star Hound Club', 'club-tx-1', 'Texas', 'TX', 'Austin', 'November 14, 2026', 35.0, 8, 60, 'Registration Open', 'Nov 13, 2026', '9200 Hound Trail', 'Texas sanctioned championship.', '7:30 PM']
  ];
  for (const e of events) {
    await db.query(
      `INSERT OR REPLACE INTO Event (id, name, federation, sport, type, club, clubId, state, stateCode, city, date, fee, entriesCount, maxCapacity, status, deadline, address, description, startTime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      e
    );
  }
  console.log('Events seeded successfully.');

  // 4. Members
  const members = [
    ['mem-1', 'Lalit Panchole', 'pancholelalit52@gmail.com', '(555) 019-2834', 'Tennessee', 'Oak Ridge Hunting Club', 'Active', 35.0, 'Jan 15, 2026'],
    ['mem-2', 'Marcus Vance', 'marcus@example.com', '(555) 019-5832', 'Tennessee', 'Oak Ridge Hunting Club', 'Active', 35.0, 'Feb 10, 2026'],
    ['mem-3', 'Cody Campbell', 'cody@example.com', '(555) 019-9182', 'Kentucky', 'Cumberland Mountain Club', 'Active', 35.0, 'Mar 05, 2026'],
    ['mem-4', 'James Wadley', 'Houstonroofing@yahoo.com', '(713) 555-0192', 'Texas', 'Lone Star Hound Club', 'Active', 45.0, 'Apr 12, 2026'],
    ['mem-5', 'Member User', 'member@gmail.com', '(555) 019-2834', 'Tennessee', 'Oak Ridge Hunting Club', 'Active', 35.0, 'Jan 01, 2026']
  ];
  for (const m of members) {
    await db.query(
      `INSERT OR REPLACE INTO Member (id, name, email, phone, state, club, status, duesAmount, joinDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      m
    );
  }
  console.log('Members seeded successfully.');

  // 5. News
  const news = [
    ['nws-1', '2026 National Championship Sanction Rule Updates', 'Updated UKC/PKC score verification procedures for 2026 state trials.', 'Sanction Rules', 'National UHC Committee', 'Aug 14, 2026', 'TN'],
    ['nws-2', 'Tennessee Youth Hound Handling Seminar Announced', 'Free seminar for youth hunters under 18 at Knoxville Hunt Grounds.', 'Youth Events', 'Tennessee State Association', 'Aug 10, 2026', 'TN'],
    ['nws-3', 'Texas State Coonhound Championship Announced', 'Annual Texas State Coonhound Championship with $10,000 purse.', 'Championship', 'Texas Hound Association', 'Aug 05, 2026', 'TX']
  ];
  for (const n of news) {
    await db.query(
      `INSERT OR REPLACE INTO News (id, title, summary, category, author, date, state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      n
    );
  }
  console.log('News seeded successfully.');

  // 6. Products
  const products = [
    ['prod-1', 'Official UKC Tracking Collar', 849.99, 'Gear', 'NATIONAL', 'Garmin Outdoor', 'National', 'UHC', 255.0, 'GPS tracking collar bundle.', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80'],
    ['prod-2', 'Oak Ridge Hunting Club Official Jacket', 549.99, 'Apparel', 'CLUB', 'Browning Outdoors', 'Club', 'club-1', 165.0, 'Water-resistant club field jacket.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80'],
    ['prod-3', 'Tennessee State Sanctioned Field Vest', 729.99, 'Apparel', 'STATE', 'Drake Waterfowl', 'State', 'state-tn', 219.0, 'Sanctioned state competition vest.', 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&auto=format&fit=crop&q=80']
  ];
  for (const p of products) {
    await db.query(
      `INSERT OR REPLACE INTO Product (id, name, price, category, scopeChannel, scopeEntity, organizationType, organizationId, profit, description, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p
    );
  }
  console.log('Products seeded successfully.');

  // 7. Event Entries
  const entries = [
    ['ent-1', 'evt-1', 'dog-101', 'Lalit Panchole', '(555) 019-2834', 30.0, 'Paid', 'UHC-100001', 'Confirmed', '2026-09-19 18:30:00'],
    ['ent-2', 'evt-1', 'dog-102', 'Marcus Vance', '(555) 019-5832', 30.0, 'Paid', 'UHC-100002', 'Confirmed', '2026-09-19 18:45:00'],
    ['ent-3', 'evt-2', 'dog-103', 'Cody Campbell', '(555) 019-9182', 45.0, 'Paid', 'UHC-100003', 'Confirmed', '2026-10-24 18:00:00'],
    ['ent-4', 'evt-3', 'dog-104', 'James Wadley', '(713) 555-0192', 35.0, 'Pending Payment', 'UHC-100004', 'Not Arrived', null]
  ];
  for (const ent of entries) {
    await db.query(
      `INSERT OR REPLACE INTO EventEntry (id, eventId, dogId, participant, handlerPhone, fee, paymentStatus, confirmationCode, checkInStatus, checkedInAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ent
    );
  }
  console.log('Event Entries seeded successfully.');

  console.log('ALL FIXTURES SEEDED SUCCESSFULLY IN LOCAL-DEV.SQLITE!');
}

seed().catch(console.error);
