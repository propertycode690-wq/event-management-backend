const fs = require('fs');
const path = require('path');

// 1. Update backend/db.js
const dbFile = path.resolve(__dirname, '../db.js');
let dbContent = fs.readFileSync(dbFile, 'utf8');

const oldUrl = 'mysql://root:PRTPRVJMLydCnXnYRgazQxqOOCBhxIkz@centerbeam.proxy.rlwy.net:53549/railway';
const newUrl = 'mysql://root:wwOyLdhgbawFdXEoeBrvXeUQIyjlxxSw@iriguchi.proxy.rlwy.net:58182/railway';

dbContent = dbContent.replace(oldUrl, newUrl);
fs.writeFileSync(dbFile, dbContent, 'utf8');
console.log('✅ Updated backend/db.js to point DEFAULT_RAILWAY_DB to Instance B (iriguchi:58182)');

// 2. Update backend/scripts/sync_railway_tables.js
const syncFile = path.resolve(__dirname, 'sync_railway_tables.js');
let syncContent = fs.readFileSync(syncFile, 'utf8');
syncContent = syncContent.replace(oldUrl, newUrl);
fs.writeFileSync(syncFile, syncContent, 'utf8');
console.log('✅ Updated backend/scripts/sync_railway_tables.js fallback URL to Instance B (iriguchi:58182)');

