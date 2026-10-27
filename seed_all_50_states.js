const db = require('./db');

const ALL_50_STATES = [
  { id: 'al', name: 'Alabama State Association', code: 'AL', organizations: 'UKC', adminName: 'Marcus Vance', clubsCount: 15, membersCount: 950, eventsCount: 4, revenue: 45000 },
  { id: 'ak', name: 'Alaska State Association', code: 'AK', organizations: 'PKC', adminName: 'Cody Campbell', clubsCount: 8, membersCount: 420, eventsCount: 2, revenue: 18000 },
  { id: 'az', name: 'Arizona State Association', code: 'AZ', organizations: 'UKC,PKC', adminName: 'Frank Reynolds', clubsCount: 18, membersCount: 1100, eventsCount: 5, revenue: 62000 },
  { id: 'ar', name: 'Arkansas State Association', code: 'AR', organizations: 'UKC', adminName: 'Dominic Rossi', clubsCount: 36, membersCount: 2240, eventsCount: 6, revenue: 115000 },
  { id: 'ca', name: 'California State Association', code: 'CA', organizations: 'PKC', adminName: 'Elena Rostova', clubsCount: 31, membersCount: 1980, eventsCount: 5, revenue: 98000 },
  { id: 'co', name: 'Colorado State Association', code: 'CO', organizations: 'PKC', adminName: 'Colorado Admin', clubsCount: 20, membersCount: 1300, eventsCount: 6, revenue: 85000 },
  { id: 'ct', name: 'Connecticut State Association', code: 'CT', organizations: 'UKC', adminName: 'Connecticut Admin', clubsCount: 12, membersCount: 750, eventsCount: 4, revenue: 48000 },
  { id: 'de', name: 'Delaware State Association', code: 'DE', organizations: 'PKC', adminName: 'Delaware Admin', clubsCount: 9, membersCount: 520, eventsCount: 3, revenue: 35000 },
  { id: 'fl', name: 'Florida State Association', code: 'FL', organizations: 'UKC,PKC', adminName: 'Carlos Mendez', clubsCount: 27, membersCount: 1760, eventsCount: 8, revenue: 122000 },
  { id: 'ga', name: 'Georgia State Association', code: 'GA', organizations: 'UKC,PKC', adminName: 'Georgia Admin', clubsCount: 33, membersCount: 2200, eventsCount: 10, revenue: 148000 },
  { id: 'hi', name: 'Hawaii State Association', code: 'HI', organizations: 'UKC', adminName: 'Hawaii Admin', clubsCount: 5, membersCount: 310, eventsCount: 2, revenue: 22000 },
  { id: 'id', name: 'Idaho State Association', code: 'ID', organizations: 'PKC', adminName: 'Idaho Admin', clubsCount: 16, membersCount: 980, eventsCount: 5, revenue: 67000 },
  { id: 'il', name: 'Illinois State Association', code: 'IL', organizations: 'UKC,PKC', adminName: 'Illinois Admin', clubsCount: 36, membersCount: 2350, eventsCount: 12, revenue: 158000 },
  { id: 'in', name: 'Indiana State Association', code: 'IN', organizations: 'UKC,PKC', adminName: 'Indiana Admin', clubsCount: 34, membersCount: 2250, eventsCount: 11, revenue: 152000 },
  { id: 'ia', name: 'Iowa State Association', code: 'IA', organizations: 'UKC', adminName: 'Iowa Admin', clubsCount: 25, membersCount: 1600, eventsCount: 8, revenue: 105000 },
  { id: 'ks', name: 'Kansas State Association', code: 'KS', organizations: 'PKC', adminName: 'Kansas Admin', clubsCount: 21, membersCount: 1400, eventsCount: 7, revenue: 90000 },
  { id: 'ky', name: 'Kentucky State Association', code: 'KY', organizations: 'UKC,PKC', adminName: 'Thomas Shelby', clubsCount: 38, membersCount: 2190, eventsCount: 11, revenue: 142100 },
  { id: 'la', name: 'Louisiana State Association', code: 'LA', organizations: 'UKC,PKC', adminName: 'Louisiana Admin', clubsCount: 26, membersCount: 1700, eventsCount: 8, revenue: 115000 },
  { id: 'me', name: 'Maine State Association', code: 'ME', organizations: 'UKC', adminName: 'Maine Admin', clubsCount: 14, membersCount: 880, eventsCount: 4, revenue: 58000 },
  { id: 'md', name: 'Maryland State Association', code: 'MD', organizations: 'PKC', adminName: 'Maryland Admin', clubsCount: 19, membersCount: 1200, eventsCount: 6, revenue: 82000 },
  { id: 'ma', name: 'Massachusetts State Association', code: 'MA', organizations: 'UKC', adminName: 'Massachusetts Admin', clubsCount: 15, membersCount: 960, eventsCount: 5, revenue: 64000 },
  { id: 'mi', name: 'Michigan State Association', code: 'MI', organizations: 'UKC,PKC', adminName: 'Michigan Admin', clubsCount: 40, membersCount: 2600, eventsCount: 13, revenue: 175000 },
  { id: 'mn', name: 'Minnesota State Association', code: 'MN', organizations: 'UKC', adminName: 'Minnesota Admin', clubsCount: 28, membersCount: 1800, eventsCount: 9, revenue: 120000 },
  { id: 'ms', name: 'Mississippi State Association', code: 'MS', organizations: 'UKC,PKC', adminName: 'Mississippi Admin', clubsCount: 23, membersCount: 1500, eventsCount: 7, revenue: 98000 },
  { id: 'mo', name: 'Missouri State Association', code: 'MO', organizations: 'UKC,PKC', adminName: 'Missouri Admin', clubsCount: 35, membersCount: 2300, eventsCount: 11, revenue: 155000 },
  { id: 'mt', name: 'Montana State Association', code: 'MT', organizations: 'PKC', adminName: 'Montana Admin', clubsCount: 13, membersCount: 820, eventsCount: 4, revenue: 54000 },
  { id: 'ne', name: 'Nebraska State Association', code: 'NE', organizations: 'UKC', adminName: 'Nebraska Admin', clubsCount: 17, membersCount: 1050, eventsCount: 5, revenue: 70000 },
  { id: 'nv', name: 'Nevada State Association', code: 'NV', organizations: 'PKC', adminName: 'Nevada Admin', clubsCount: 11, membersCount: 680, eventsCount: 4, revenue: 45000 },
  { id: 'nh', name: 'New Hampshire State Association', code: 'NH', organizations: 'UKC', adminName: 'New Hampshire Admin', clubsCount: 10, membersCount: 600, eventsCount: 3, revenue: 40000 },
  { id: 'nj', name: 'New Jersey State Association', code: 'NJ', organizations: 'PKC', adminName: 'New Jersey Admin', clubsCount: 20, membersCount: 1250, eventsCount: 6, revenue: 84000 },
  { id: 'nm', name: 'New Mexico State Association', code: 'NM', organizations: 'UKC', adminName: 'New Mexico Admin', clubsCount: 14, membersCount: 890, eventsCount: 4, revenue: 59000 },
  { id: 'ny', name: 'New York State Association', code: 'NY', organizations: 'UKC,PKC', adminName: 'Dominic Rossi', clubsCount: 24, membersCount: 1540, eventsCount: 7, revenue: 110000 },
  { id: 'nc', name: 'North Carolina State Association', code: 'NC', organizations: 'UKC,PKC', adminName: 'Lucas Scott', clubsCount: 35, membersCount: 2410, eventsCount: 14, revenue: 165000 },
  { id: 'nd', name: 'North Dakota State Association', code: 'ND', organizations: 'PKC', adminName: 'North Dakota Admin', clubsCount: 9, membersCount: 540, eventsCount: 3, revenue: 36000 },
  { id: 'oh', name: 'Ohio State Association', code: 'OH', organizations: 'UKC,PKC', adminName: 'Jack Crawford', clubsCount: 48, membersCount: 3120, eventsCount: 16, revenue: 205000 },
  { id: 'ok', name: 'Oklahoma State Association', code: 'OK', organizations: 'UKC,PKC', adminName: 'Oklahoma Admin', clubsCount: 24, membersCount: 1550, eventsCount: 7, revenue: 102000 },
  { id: 'or', name: 'Oregon State Association', code: 'OR', organizations: 'UKC', adminName: 'Oregon Admin', clubsCount: 19, membersCount: 1220, eventsCount: 6, revenue: 81000 },
  { id: 'pa', name: 'Pennsylvania State Association', code: 'PA', organizations: 'UKC,PKC', adminName: 'Pennsylvania Admin', clubsCount: 37, membersCount: 2450, eventsCount: 12, revenue: 162000 },
  { id: 'ri', name: 'Rhode Island State Association', code: 'RI', organizations: 'UKC', adminName: 'Rhode Island Admin', clubsCount: 6, membersCount: 380, eventsCount: 2, revenue: 25000 },
  { id: 'sc', name: 'South Carolina State Association', code: 'SC', organizations: 'UKC,PKC', adminName: 'South Carolina Admin', clubsCount: 28, membersCount: 1820, eventsCount: 9, revenue: 121000 },
  { id: 'sd', name: 'South Dakota State Association', code: 'SD', organizations: 'PKC', adminName: 'South Dakota Admin', clubsCount: 11, membersCount: 690, eventsCount: 4, revenue: 46000 },
  { id: 'tn', name: 'Tennessee State Association', code: 'TN', organizations: 'UKC,PKC', adminName: 'Sarah Tennessee', clubsCount: 42, membersCount: 2890, eventsCount: 8, revenue: 185000 },
  { id: 'tx', name: 'Texas Hound Association', code: 'TX', organizations: 'UKC,PKC', adminName: 'Austin Sterling', clubsCount: 54, membersCount: 3920, eventsCount: 7, revenue: 245000 },
  { id: 'ut', name: 'Utah State Association', code: 'UT', organizations: 'PKC', adminName: 'Utah Admin', clubsCount: 15, membersCount: 970, eventsCount: 5, revenue: 66000 },
  { id: 'vt', name: 'Vermont State Association', code: 'VT', organizations: 'UKC', adminName: 'Vermont Admin', clubsCount: 8, membersCount: 490, eventsCount: 3, revenue: 33000 },
  { id: 'va', name: 'Virginia State Association', code: 'VA', organizations: 'UKC,PKC', adminName: 'Rachel Green', clubsCount: 29, membersCount: 1850, eventsCount: 8, revenue: 118400 },
  { id: 'wa', name: 'Washington State Association', code: 'WA', organizations: 'UKC', adminName: 'Washington Admin', clubsCount: 22, membersCount: 1420, eventsCount: 7, revenue: 94000 },
  { id: 'wv', name: 'West Virginia State Association', code: 'WV', organizations: 'UKC,PKC', adminName: 'West Virginia Admin', clubsCount: 21, membersCount: 1380, eventsCount: 6, revenue: 91000 },
  { id: 'wi', name: 'Wisconsin State Association', code: 'WI', organizations: 'UKC,PKC', adminName: 'Wisconsin Admin', clubsCount: 32, membersCount: 2100, eventsCount: 10, revenue: 140000 },
  { id: 'wy', name: 'Wyoming State Association', code: 'WY', organizations: 'PKC', adminName: 'Wyoming Admin', clubsCount: 10, membersCount: 610, eventsCount: 3, revenue: 41000 }
];

async function seedAllStates() {
  try {
    console.log(`Starting seeding of all ${ALL_50_STATES.length} US State Associations into MySQL...`);
    for (const s of ALL_50_STATES) {
      await db.query(
        `INSERT INTO \`StateAssociation\` (\`id\`, \`name\`, \`code\`, \`organizations\`, \`adminName\`, \`clubsCount\`, \`membersCount\`, \`eventsCount\`, \`revenue\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`code\`=VALUES(\`code\`), \`organizations\`=VALUES(\`organizations\`), \`adminName\`=VALUES(\`adminName\`), \`clubsCount\`=VALUES(\`clubsCount\`), \`membersCount\`=VALUES(\`membersCount\`), \`eventsCount\`=VALUES(\`eventsCount\`), \`revenue\`=VALUES(\`revenue\`);`,
        [s.id, s.name, s.code, s.organizations, s.adminName, s.clubsCount, s.membersCount, s.eventsCount, s.revenue]
      );
    }
    const [countRows] = await db.query('SELECT COUNT(*) as total FROM `StateAssociation`');
    console.log(`✅ Successfully seeded! Total State Associations in MySQL database: ${countRows[0].total}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding states:', err.message);
    process.exit(1);
  }
}

seedAllStates();
