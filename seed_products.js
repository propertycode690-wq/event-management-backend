const conn = require('./db');

async function seedProducts() {
  console.log('Connecting to MySQL `club` to seed products...');


  // Check columns in Product table
  const [cols] = await conn.query('DESCRIBE `Product`');
  const existingCols = cols.map(c => c.Field);
  console.log('Existing columns in Product:', existingCols);

  const neededCols = [
    { name: 'wholesaleCost', type: 'DOUBLE DEFAULT 0.0' },
    { name: 'margin', type: 'DOUBLE DEFAULT 0.0' },
    { name: 'inStock', type: 'INT DEFAULT 50' },
    { name: 'vendorName', type: 'VARCHAR(191) DEFAULT \'UHC National Organization\'' },
    { name: 'source', type: 'VARCHAR(191) DEFAULT \'UHC\'' }
  ];

  for (const c of neededCols) {
    if (!existingCols.includes(c.name)) {
      console.log(`Adding missing column ${c.name} to Product table...`);
      try {
        await conn.query(`ALTER TABLE \`Product\` ADD COLUMN \`${c.name}\` ${c.type};`);
        console.log(`Column ${c.name} added!`);
      } catch (err) {
        console.warn(`Could not add column ${c.name}:`, err.message);
      }
    }
  }

  const products = [
    {
      id: 'mkt-uhc-1',
      name: 'UHC National Championship Official Field Cap',
      category: 'Caps',
      price: 38.00,
      wholesaleCost: 18.00,
      margin: 20.00,
      profit: 20.00,
      vendorName: 'UHC National Organization',
      source: 'UHC',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 80,
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80',
      description: 'Structured mesh-back embroidered Ultimate Hound Club official championship logo cap.'
    },
    {
      id: 'mkt-uhc-2',
      name: 'UHC National Championship Heavyweight Hoodie',
      category: 'Hoodies',
      price: 68.00,
      wholesaleCost: 35.00,
      margin: 33.00,
      profit: 33.00,
      vendorName: 'UHC National Organization',
      source: 'UHC',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 45,
      image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80',
      description: 'Fleece-lined national champion commemorative pullover hoodie with stitched chest emblem.'
    },
    {
      id: 'mkt-k9-1',
      name: 'K9 Keep Real-Time Hound GPS Tracking Collar',
      category: 'Gear',
      price: 249.00,
      wholesaleCost: 165.00,
      margin: 84.00,
      profit: 84.00,
      vendorName: 'K9 Keep Systems',
      source: 'K9 Keep',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 30,
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&auto=format&fit=crop&q=80',
      description: 'K9 Keep advanced long-range GPS dog telemetry collar with live bark and treeing alerts.'
    },
    {
      id: 'mkt-k9-2',
      name: 'K9 Keep Canine Performance Activity & Heat Monitor',
      category: 'Gear',
      price: 119.00,
      wholesaleCost: 75.00,
      margin: 44.00,
      profit: 44.00,
      vendorName: 'K9 Keep Systems',
      source: 'K9 Keep',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 40,
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80',
      description: 'Lightweight biometric sensor monitoring hunting stamina, hydration, and body temperature.'
    },
    {
      id: 'mkt-garmin-1',
      name: 'Garmin Alpha 300 TT25 Dog Tracking & Training System',
      category: 'Electronics',
      price: 849.00,
      wholesaleCost: 650.00,
      margin: 199.00,
      profit: 199.00,
      vendorName: 'Garmin Outdoor',
      source: 'Garmin',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 15,
      image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=400&auto=format&fit=crop&q=80',
      description: 'Flagship handheld GPS with responsive 3.5 touchscreen and inReach satellite capability.'
    },
    {
      id: 'mkt-sportdog-1',
      name: 'SportDOG Brand WetlandHunter 425X E-Collar System',
      category: 'Electronics',
      price: 189.95,
      wholesaleCost: 125.00,
      margin: 64.95,
      profit: 64.95,
      vendorName: 'SportDOG Brand',
      source: 'SportDOG',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 25,
      image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&auto=format&fit=crop&q=80',
      description: 'Compact 500-yard electronic remote trainer in Realtree Max-5 camo. Fully waterproof.'
    },
    {
      id: 'mkt-dogtra-1',
      name: 'Dogtra Pathfinder2 GPS Dog Tracking System',
      category: 'Electronics',
      price: 449.99,
      wholesaleCost: 310.00,
      margin: 139.99,
      profit: 139.99,
      vendorName: 'Dogtra Systems',
      source: 'Dogtra',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 18,
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&auto=format&fit=crop&q=80',
      description: 'Real-time 9-mile range tracking with offline satellite maps and smart fences.'
    },
    {
      id: 'mkt-mule-1',
      name: 'Mule Hunting Gear Super Heavyweight Briar Bibs',
      category: 'Apparel',
      price: 139.00,
      wholesaleCost: 85.00,
      margin: 54.00,
      profit: 54.00,
      vendorName: 'Mule Hunting Gear',
      source: 'Mule',
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 35,
      image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&auto=format&fit=crop&q=80',
      description: 'Rugged brush-busting briarproof overalls designed to withstand thickest mountain briers.'
    },
    {
      id: 'mkt-dans-1',
      name: "Dan's Hunting Gear 5-Star Briarproof Hunting Jacket",
      category: 'Apparel',
      price: 165.00,
      wholesaleCost: 105.00,
      margin: 60.00,
      profit: 60.00,
      vendorName: "Dan's Hunting Gear",
      source: "Dan's",
      scopeChannel: 'NATIONAL',
      organizationType: 'NATIONAL',
      inStock: 22,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80',
      description: 'Heavy nylon-faced waterproof briarproof coat with fleece hand-warmer pockets.'
    },
    // State Merchandise
    {
      id: 'prod-ky-1',
      name: 'Kentucky State Championship Water Race Jersey',
      category: 'Apparel',
      price: 45.00,
      wholesaleCost: 22.00,
      margin: 23.00,
      profit: 23.00,
      vendorName: 'UHC National Organization',
      source: 'STATE',
      scopeChannel: 'STATE',
      organizationType: 'STATE',
      organizationId: 'ky',
      scopeEntity: 'Kentucky State Association',
      inStock: 50,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80',
      description: 'Official Kentucky State Association moisture-wicking championship competition jersey.'
    },
    {
      id: 'prod-hi-1',
      name: 'Hawaii Island Coonhound & Bay Dog Official Field Cap',
      category: 'Caps',
      price: 35.00,
      wholesaleCost: 16.00,
      margin: 19.00,
      profit: 19.00,
      vendorName: 'UHC National Organization',
      source: 'STATE',
      scopeChannel: 'STATE',
      organizationType: 'STATE',
      organizationId: 'hi',
      scopeEntity: 'Hawaii State Association',
      inStock: 40,
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80',
      description: 'Official Hawaii State Association embroidered cap with Island hound emblem.'
    },
    {
      id: 'prod-tx-1',
      name: 'Texas State Association Official Performance Cap',
      category: 'Caps',
      price: 28.00,
      wholesaleCost: 14.00,
      margin: 14.00,
      profit: 14.00,
      vendorName: 'UHC National Organization',
      source: 'STATE',
      scopeChannel: 'STATE',
      organizationType: 'STATE',
      organizationId: 'tx',
      scopeEntity: 'Texas Hound Association',
      inStock: 75,
      image: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=400&auto=format&fit=crop&q=80',
      description: 'Texas State Hound Association official embroidered low-profile performance cap.'
    },
    // Club Merchandise
    {
      id: 'club-prod-2',
      name: 'Cumberland Mountain Club Official Water Race Cap',
      category: 'Caps',
      price: 26.00,
      wholesaleCost: 13.00,
      margin: 13.00,
      profit: 13.00,
      vendorName: 'UHC National Organization',
      source: 'CLUB',
      scopeChannel: 'LOCAL_CLUB',
      organizationType: 'CLUB',
      organizationId: 'club-2',
      scopeEntity: 'Cumberland Mountain Club',
      inStock: 60,
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80',
      description: 'Official Cumberland Mountain Club Middlesboro, KY embroidered cap. All profits support local club.'
    },
    {
      id: 'club-prod-hi-1',
      name: 'Honolulu Hound & Hunting Club Official Logo Cap',
      category: 'Caps',
      price: 28.00,
      wholesaleCost: 14.00,
      margin: 14.00,
      profit: 14.00,
      vendorName: 'UHC National Organization',
      source: 'CLUB',
      scopeChannel: 'LOCAL_CLUB',
      organizationType: 'CLUB',
      organizationId: 'club-hi-1',
      scopeEntity: 'Honolulu Hound & Hunting Club',
      inStock: 50,
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&auto=format&fit=crop&q=80',
      description: 'Official Honolulu Hound & Hunting Club cap. Profits deposited directly to club treasury.'
    }
  ];

  console.log(`Inserting / updating ${products.length} products in Railway MySQL...`);

  for (const p of products) {
    await conn.query(
      `INSERT INTO \`Product\` (\`id\`, \`name\`, \`price\`, \`category\`, \`scopeChannel\`, \`scopeEntity\`, \`organizationType\`, \`organizationId\`, \`profit\`, \`description\`, \`image\`, \`wholesaleCost\`, \`margin\`, \`inStock\`, \`vendorName\`, \`source\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`name\`=VALUES(\`name\`), \`price\`=VALUES(\`price\`), \`category\`=VALUES(\`category\`),
         \`scopeChannel\`=VALUES(\`scopeChannel\`), \`scopeEntity\`=VALUES(\`scopeEntity\`),
         \`organizationType\`=VALUES(\`organizationType\`), \`organizationId\`=VALUES(\`organizationId\`),
         \`profit\`=VALUES(\`profit\`), \`description\`=VALUES(\`description\`), \`image\`=VALUES(\`image\`),
         \`wholesaleCost\`=VALUES(\`wholesaleCost\`), \`margin\`=VALUES(\`margin\`), \`inStock\`=VALUES(\`inStock\`),
         \`vendorName\`=VALUES(\`vendorName\`), \`source\`=VALUES(\`source\`);`,
      [
        p.id,
        p.name,
        p.price,
        p.category,
        p.scopeChannel || 'NATIONAL',
        p.scopeEntity || 'National UHC',
        p.organizationType || 'NATIONAL',
        p.organizationId || 'national',
        p.profit || 20.0,
        p.description,
        p.image,
        p.wholesaleCost || 0.0,
        p.margin || 0.0,
        p.inStock || 50,
        p.vendorName || 'UHC National Organization',
        p.source || 'UHC'
      ]
    );
  }

  console.log('🎉 Successfully seeded all products into Railway MySQL database `Product` table!');
  const [[cnt]] = await conn.query('SELECT COUNT(*) as c FROM `Product`');
  console.log(`Total Products in DB: ${cnt.c}`);
  process.exit(0);
}

seedProducts().catch((err) => {
  console.error(err);
  process.exit(1);
});
