const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

async function seedRailwayDatabase() {
  console.log('Connecting to Live Railway MySQL at', process.env.DB_HOST, 'port', process.env.DB_PORT, 'database', process.env.DB_NAME);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Connected to Live Railway MySQL successfully!');

  // 1. Seed / Update Local Clubs
  console.log('Seeding LocalClubs into live DB...');
  const clubs = [
    // Tennessee
    ['club-1', 'Oak Ridge Hunting Club', 'Knoxville', 'Knox County', 'Tennessee', 'TN', 'tn', '37901', 18, 'Treeing Walker Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 84, 6, 217, 6790, 'Robert Miller'],
    ['club-4', 'Smoky Mountain Coonhunters', 'Sevierville', 'Sevier County', 'Tennessee', 'TN', 'tn', '37862', 25, 'Bluetick Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 62, 4, 180, 5200, 'John Walker'],
    // Kentucky
    ['club-2', 'Cumberland Mountain Club', 'Middlesboro', 'Bell County', 'Kentucky', 'KY', 'ky', '40965', 64, 'English Redtick Coonhound', 'AKC (American Kennel Club)', 'Water Race', 96, 8, 304, 8940, 'Thomas Shelby'],
    ['club-6', 'Tri-County Beagle Club', 'London', 'Laurel County', 'Kentucky', 'KY', 'ky', '40741', 45, 'Beagle', 'UKC (United Kennel Club)', 'Rabbit Trial', 78, 5, 195, 6100, 'William Vance'],
    ['club-7', 'Bluegrass Coonhound Chapter', 'Lexington', 'Fayette County', 'Kentucky', 'KY', 'ky', '40507', 30, 'Treeing Walker Coonhound', 'PKC (Professional Kennel Club)', 'Nite Hunt', 110, 7, 340, 10500, 'David Evans'],
    // Hawaii
    ['club-hi-1', 'Honolulu Hound & Hunting Club', 'Honolulu', 'Honolulu County', 'Hawaii', 'HI', 'hi', '96813', 10, 'Treeing Walker Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 42, 3, 95, 3400, 'James Wadley'],
    ['club-hi-2', 'Big Island Tracking & Bay Club', 'Hilo', 'Hawaii County', 'Hawaii', 'HI', 'hi', '96720', 25, 'Hog Dog / Bay Dog', 'Independent', 'Bay Contest', 58, 4, 140, 4800, 'Kai Kealoha'],
    // Texas
    ['club-tx-central', 'Central Texas Hound Club', 'Waco', 'McLennan County', 'Texas', 'TX', 'tx', '76701', 20, 'Treeing Walker Coonhound', 'Independent', 'Bench Show', 82, 6, 225, 8700, 'Caleb Vance'],
    ['club-tx-houston', 'Houston County Coon Hunters Association', 'Crockett', 'Houston County', 'Texas', 'TX', 'tx', '75835', 15, 'Black and Tan Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 125, 9, 410, 13400, 'Austin Sterling'],
    ['club-tx-east', 'Piney Woods Coonhound Club', 'Lufkin', 'Angelina County', 'Texas', 'TX', 'tx', '75901', 35, 'Redbone Coonhound', 'PKC (Professional Kennel Club)', 'Field Trial', 94, 6, 280, 9200, 'Travis Cole'],
    ['club-tx-south', 'Rio Grande Working Hound Association', 'San Antonio', 'Bexar County', 'Texas', 'TX', 'tx', '78201', 50, 'Plott Hound', 'UKC (United Kennel Club)', 'Treeing Contest', 88, 5, 230, 7600, 'Elena Rostova'],
    ['club-5', 'Lone Star Hound Club', 'Austin', 'Travis County', 'Texas', 'TX', 'tx', '78701', 12, 'Treeing Walker Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 105, 8, 360, 11200, 'Jake Miller'],
    // Virginia & Missouri
    ['club-3', 'Blue Ridge Hound Club', 'Roanoke', 'Roanoke County', 'Virginia', 'VA', 'va', '24001', 40, 'Beagle', 'AKC (American Kennel Club)', 'Field Trial', 72, 4, 160, 4900, 'Rachel Green'],
    ['club-8', 'Ozark Mountain Bay Dogs', 'Springfield', 'Greene County', 'Missouri', 'MO', 'mo', '65802', 28, 'Cur & Feist', 'Independent', 'Squirrel Hunt', 65, 3, 145, 4300, 'Travis Cole']
  ];

  for (const c of clubs) {
    await conn.query(
      `INSERT INTO \`LocalClub\` (\`id\`, \`name\`, \`city\`, \`county\`, \`state\`, \`stateCode\`, \`stateId\`, \`zip\`, \`distanceMiles\`, \`dogType\`, \`federation\`, \`eventType\`, \`membersCount\`, \`eventsCount\`, \`entriesCount\`, \`revenue\`, \`adminName\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         \`name\`=VALUES(\`name\`), \`city\`=VALUES(\`city\`), \`county\`=VALUES(\`county\`), \`state\`=VALUES(\`state\`), \`stateCode\`=VALUES(\`stateCode\`),
         \`stateId\`=VALUES(\`stateId\`), \`zip\`=VALUES(\`zip\`), \`distanceMiles\`=VALUES(\`distanceMiles\`), \`dogType\`=VALUES(\`dogType\`),
         \`federation\`=VALUES(\`federation\`), \`eventType\`=VALUES(\`eventType\`), \`membersCount\`=VALUES(\`membersCount\`),
         \`eventsCount\`=VALUES(\`eventsCount\`), \`entriesCount\`=VALUES(\`entriesCount\`), \`revenue\`=VALUES(\`revenue\`), \`adminName\`=VALUES(\`adminName\`);`,
      c
    );
  }
  console.log(`Inserted / updated ${clubs.length} LocalClubs!`);

  // 2. Seed / Update Events
  console.log('Seeding Events into live DB...');
  const events = [
    // Tennessee
    ['evt-1', 'Nite Hunt & Treeing Contest', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'September 19, 2026', 30.0, 43, 50, 'Registration Open', 'Sep 18, 2026', '1420 Hunting Ridge Rd, Knoxville, TN 37901', 'Annual night coon hunt and treeing championship. UKC rules apply. Trophies for top 5 hounds.', '7:00 PM'],
    ['evt-2', 'Fall Championship Hunt', 'PKC (Professional Kennel Club)', 'Coonhounds', 'Championship Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'October 24, 2026', 45.0, 28, 60, 'Registration Open', 'Oct 23, 2026', '1420 Hunting Ridge Rd, Knoxville, TN 37901', 'Premier autumn PKC championship night hunt with double qualification points.', '6:30 PM'],
    // Kentucky
    ['evt-3', 'Cumberland Mountain Water Race', 'AKC (American Kennel Club)', 'Coonhounds', 'Water Race', 'Cumberland Mountain Club', 'club-2', 'Kentucky', 'KY', 'Middlesboro', 'October 03, 2026', 25.0, 31, 40, 'Registration Open', 'Oct 02, 2026', '770 Cumberland Gap Pkwy, Middlesboro, KY 40965', 'High-speed coonhound pond water swim race & straight line speed trial. AKC sanctioned.', '1:00 PM'],
    ['evt-4', 'National Beagle Rabbit Pack Trial', 'UKC (United Kennel Club)', 'Beagles', 'Field Trial', 'Cumberland Mountain Club', 'club-2', 'Kentucky', 'KY', 'Middlesboro', 'October 17, 2026', 35.0, 52, 60, 'Registration Open', 'Oct 16, 2026', '840 Pine Mountain Trail, Middlesboro, KY 40965', 'Full pack 13-inch and 15-inch beagle rabbit trial over rolling timber coverts.', '8:00 AM'],
    ['evt-ky-3', 'Bluegrass Autumn Nite Hunt & Treeing Show', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Bluegrass Coonhound Chapter', 'club-7', 'Kentucky', 'KY', 'Lexington', 'November 07, 2026', 30.0, 45, 60, 'Registration Open', 'Nov 06, 2026', '1200 Horse Country Rd, Lexington, KY 40507', 'Sanctioned 2-hour nite hunt plus official bench show and treeing contest.', '6:00 PM'],
    // Hawaii
    ['evt-hi-1', 'Hawaii Islands Inaugural Sanctioned Coonhound Trial', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Honolulu Hound & Hunting Club', 'club-hi-1', 'Hawaii', 'HI', 'Honolulu', 'November 14, 2026', 35.0, 24, 40, 'Registration Open', 'Nov 13, 2026', '950 Pali Highway Forest Grounds, Honolulu, HI 96813', 'First official UHC-sanctioned hound trial on Oahu. Island tracking, treeing competition, and points leaderboard.', '7:00 PM'],
    ['evt-hi-2', 'Pacific Big Game Hog & Bay Championship', 'Independent', 'Hog Dogs', 'Bay Contest', 'Big Island Tracking & Bay Club', 'club-hi-2', 'Hawaii', 'HI', 'Hilo', 'December 05, 2026', 40.0, 36, 50, 'Registration Open', 'Dec 04, 2026', '420 Saddle Road Trials, Hilo, HI 96720', 'High-energy bay dog trial with official time tracking, barking intensity scorecards, and champion buckles.', '9:00 AM'],
    // Texas
    ['evt-8', 'Texas State Lone Star Championship Hunt', 'UKC (United Kennel Club)', 'Coonhounds', 'Championship Hunt', 'Central Texas Hound Club', 'club-tx-central', 'Texas', 'TX', 'Waco', 'October 30, 2026', 40.0, 68, 80, 'Registration Open', 'Oct 29, 2026', '450 Brazos River Trail, Waco, TX 76701', 'Official Texas State Championship qualifying hunt with $5,000 added purse.', '7:30 PM'],
    ['evt-tx-ukc', 'Texas UKC Sanctioned Autumn Nite Hunt', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Houston County Coon Hunters Association', 'club-tx-houston', 'Texas', 'TX', 'Crockett', 'October 25, 2026', 35.0, 44, 60, 'Registration Open', 'Oct 24, 2026', '310 Timberline Trail, Crockett, TX 75835', 'Premier UKC World Championship qualifying event held in the Davy Crockett National Forest.', '7:00 PM'],
    ['evt-tx-ind', 'Texas Hill Country Open Hound Pursuit', 'Independent', 'Coonhounds', 'Night Hunt', 'Central Texas Hound Club', 'club-tx-central', 'Texas', 'TX', 'Kerrville', 'November 14, 2026', 25.0, 32, 50, 'Registration Open', 'Nov 13, 2026', '1250 Guadalupe River Grounds, Kerrville, TX 78028', 'Open breed trial welcoming Treeing Walkers, Plotts, and Blueticks.', '8:00 PM'],
    ['evt-tx-youth', 'Texas State Junior Hunter & Youth Championship', 'UKC (United Kennel Club)', 'All Breeds', 'Youth Championship', 'Piney Woods Coonhound Club', 'club-tx-east', 'Texas', 'TX', 'Lufkin', 'November 21, 2026', 15.0, 28, 40, 'Registration Open', 'Nov 20, 2026', '880 Angelina Trail, Lufkin, TX 75901', 'Free mentorship and entry for handlers under 18 years old.', '5:00 PM'],
    ['evt-tx-bench', 'Texas State Conformation & Breed Bench Show', 'UKC (United Kennel Club)', 'Coonhounds', 'Bench Show', 'Central Texas Hound Club', 'club-tx-central', 'Texas', 'TX', 'Tyler', 'December 05, 2026', 20.0, 38, 50, 'Registration Open', 'Dec 04, 2026', '500 Rose City Exhibition Arena, Tyler, TX 75701', 'Official UKC breed confirmation scoring head, bite, coat, and structure.', '11:00 AM'],
    ['evt-tx-field', 'Texas Piney Woods Field Trial Championship', 'PKC (Professional Kennel Club)', 'Coonhounds', 'Field Trial', 'Piney Woods Coonhound Club', 'club-tx-east', 'Texas', 'TX', 'Nacogdoches', 'December 12, 2026', 40.0, 50, 60, 'Registration Open', 'Dec 11, 2026', '1400 Old Stone Fort Rd, Nacogdoches, TX 75961', 'Championship speed and tree tracking trial through mature East Texas pine woodlands.', '7:30 AM'],
    // Virginia & California
    ['evt-5', 'Blue Ridge Beagle Field Championship', 'AKC (American Kennel Club)', 'Beagles', 'Field Trial', 'Blue Ridge Hound Club', 'club-3', 'Virginia', 'VA', 'Roanoke', 'October 10, 2026', 30.0, 34, 45, 'Registration Open', 'Oct 09, 2026', '120 Mountain Pass Rd, Roanoke, VA 24001', 'Fall rabbit tracking trial across high-elevation timber ridges.', '8:30 AM'],
    ['evt-9', 'California Pacific Coastal Field Trial', 'AKC (American Kennel Club)', 'Beagles', 'Field Trial', 'Pacific Coast Beagle Club', 'club-1', 'California', 'CA', 'Salinas', 'November 07, 2026', 35.0, 29, 45, 'Registration Open', 'Nov 06, 2026', '600 Coastal Ridge Way, Salinas, CA 93901', 'Pacific coast coastal rabbit trial with challenging coastal winds.', '8:00 AM']
  ];

  for (const e of events) {
    await conn.query(
      `INSERT INTO \`Event\` (\`id\`, \`name\`, \`federation\`, \`sport\`, \`type\`, \`club\`, \`clubId\`, \`state\`, \`stateCode\`, \`city\`, \`date\`, \`fee\`, \`entriesCount\`, \`maxCapacity\`, \`status\`, \`deadline\`, \`address\`, \`description\`, \`startTime\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`name\`=VALUES(\`name\`), \`federation\`=VALUES(\`federation\`), \`sport\`=VALUES(\`sport\`), \`type\`=VALUES(\`type\`),
         \`club\`=VALUES(\`club\`), \`clubId\`=VALUES(\`clubId\`), \`state\`=VALUES(\`state\`), \`stateCode\`=VALUES(\`stateCode\`),
         \`city\`=VALUES(\`city\`), \`date\`=VALUES(\`date\`), \`fee\`=VALUES(\`fee\`), \`entriesCount\`=VALUES(\`entriesCount\`),
         \`maxCapacity\`=VALUES(\`maxCapacity\`), \`status\`=VALUES(\`status\`), \`deadline\`=VALUES(\`deadline\`),
         \`address\`=VALUES(\`address\`), \`description\`=VALUES(\`description\`), \`startTime\`=VALUES(\`startTime\`);`,
      e
    );
  }
  console.log(`Inserted / updated ${events.length} Events!`);

  // 3. Seed / Update News
  console.log('Seeding News into live DB...');
  const news = [
    ['news-ky-1', 'Kentucky State Water Race and Field Championship Qualifiers Announced', 'Official sanctioning for the 2026 Kentucky State Autumn Water Race in Middlesboro, KY with cash prizes and qualification spots for the UKC World Championship.', 'State Hunt announcements', 'Kentucky State Association Board', 'October 12, 2026', 'Kentucky'],
    ['news-ky-2', 'Cumberland Mountain Beagle Pack Trial Schedule Released', 'Cumberland Mountain Club announces complete pack running dates and judges list for the October 17th Beagle Rabbit Trial.', 'Club News', 'Thomas Shelby', 'October 08, 2026', 'Kentucky'],
    ['news-hi-1', 'Hawaii State Association Launches Official Sandbox Portal & Sanctioned Hunt Network', 'Hawaii welcomes sanctioned coonhound trials with full digital registration, live scorecards, and local club affiliation.', 'State Governance', 'Hawaii State Association Board', 'October 23, 2026', 'Hawaii'],
    ['news-tx-1', 'Texas State Autumn Championship Nite Hunt Announced', 'Official sanctioning for the 2026 Texas State Autumn Nite Hunt in Austin, TX with $5,000 added purse and double state championship points.', 'State Hunt announcements', 'Texas State Association Board', 'August 12, 2026', 'Texas'],
    ['news-tx-2', 'Texas State Championship Final Placements & Winner Recognized', 'Central Texas Hound Club congratulates Austin Sterling and hound "Copper Ridge Ranger" for capturing 1st place overall.', 'Field Trial Results', 'Central Texas Hound Club', 'August 10, 2026', 'Texas'],
    ['news-tn-1', 'Tennessee State Coonhound Association 2026 Championship Update', 'Oak Ridge Hunting Club confirms dates for the Annual Fall Championship with over 60 hounds registered.', 'State News', 'Sarah Tennessee', 'September 15, 2026', 'Tennessee']
  ];

  for (const n of news) {
    await conn.query(
      `INSERT INTO \`News\` (\`id\`, \`title\`, \`summary\`, \`category\`, \`author\`, \`date\`, \`state\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`title\`=VALUES(\`title\`), \`summary\`=VALUES(\`summary\`), \`category\`=VALUES(\`category\`),
         \`author\`=VALUES(\`author\`), \`date\`=VALUES(\`date\`), \`state\`=VALUES(\`state\`);`,
      n
    );
  }
  console.log(`Inserted / updated ${news.length} News articles!`);

  // 4. Seed / Update Verified Members (including James Wadley)
  console.log('Seeding Members into live DB...');
  const members = [
    ['mem-james', 'James Wadley', 'Houstonroofing@yahoo.com', '(713) 555-0192', 'Hawaii', 'Honolulu Hound & Hunting Club', 'Active', 45.0, 'Oct 23, 2026'],
    ['mem-1', 'John Walker', 'demo@example.com', '(865) 555-0192', 'Tennessee', 'Oak Ridge Hunting Club', 'Active', 45.0, 'Jan 15, 2026'],
    ['mem-2', 'Thomas Shelby', 'thomas@cumberlandhc.org', '(606) 555-0311', 'Kentucky', 'Cumberland Mountain Club', 'Active', 45.0, 'Feb 10, 2026'],
    ['mem-3', 'Austin Sterling', 'austin@texashounds.org', '(512) 555-0144', 'Texas', 'Houston County Coon Hunters Association', 'Active', 45.0, 'Mar 01, 2026'],
    ['mem-4', 'Diya Sharma', 'diya.sharma@example.com', '(800) 555-0199', 'Tennessee', 'Oak Ridge Hunting Club', 'Active', 45.0, 'Oct 24, 2026']
  ];

  for (const m of members) {
    await conn.query(
      `INSERT INTO \`Member\` (\`id\`, \`name\`, \`email\`, \`phone\`, \`state\`, \`club\`, \`status\`, \`duesAmount\`, \`joinDate\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`name\`=VALUES(\`name\`), \`email\`=VALUES(\`email\`), \`phone\`=VALUES(\`phone\`), \`state\`=VALUES(\`state\`),
         \`club\`=VALUES(\`club\`), \`status\`=VALUES(\`status\`), \`duesAmount\`=VALUES(\`duesAmount\`);`,
      m
    );
  }
  console.log(`Inserted / updated ${members.length} Members!`);

  // 5. Update State Associations with correct counts
  console.log('Updating StateAssociation counts...');
  await conn.query(`
    UPDATE \`StateAssociation\` SET \`clubsCount\`=3, \`eventsCount\`=3, \`membersCount\`=284 WHERE \`code\`='KY';
  `);
  await conn.query(`
    UPDATE \`StateAssociation\` SET \`clubsCount\`=2, \`eventsCount\`=2, \`membersCount\`=100, \`adminName\`='James Wadley' WHERE \`code\`='HI';
  `);
  await conn.query(`
    UPDATE \`StateAssociation\` SET \`clubsCount\`=5, \`eventsCount\`=6, \`membersCount\`=540 WHERE \`code\`='TX';
  `);
  await conn.query(`
    UPDATE \`StateAssociation\` SET \`clubsCount\`=2, \`eventsCount\`=2, \`membersCount\`=146 WHERE \`code\`='TN';
  `);

  console.log('🎉 Railway MySQL database successfully populated with all real data across Kentucky, Hawaii, Texas, Tennessee!');
  await conn.end();
}

seedRailwayDatabase().catch(err => {
  console.error('Database seeding failed:', err);
  process.exit(1);
});
