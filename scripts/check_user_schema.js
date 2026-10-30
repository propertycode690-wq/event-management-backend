const fs = require('fs');
const b = JSON.parse(fs.readFileSync('c:/Users/admin/Desktop/98645312/Events/backend/backups/latest_backup_verification.json', 'utf8'));
const backupA = JSON.parse(fs.readFileSync(b.resultA.filePath, 'utf8'));
console.log('User schema in Instance A (centerbeam):');
console.log(backupA.tables.User.schema);
const backupB = JSON.parse(fs.readFileSync(b.resultB.filePath, 'utf8'));
console.log('\nUser schema in Instance B (iriguchi):');
console.log(backupB.tables.User.schema);
