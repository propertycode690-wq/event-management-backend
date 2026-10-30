const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../../frontend/src/pages/public/LoginPage.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('Pass: 12345678', 'Select Role Email');
content = content.replace(/setPassword\('12345678'\);/g, '// password entered securely by authorized user');

fs.writeFileSync(file, content, 'utf8');
console.log('✅ LoginPage.jsx patched successfully');

