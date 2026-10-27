const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Initializing `club.db` database and tables for National Hunting Network Portal...');

try {
  // Ensure schema.prisma has correct sqlite file URL
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Generate Prisma Client & Push DB
  console.log('⚙️ Running Prisma Database Setup...');
  execSync('npx --no-install prisma db push', { cwd: __dirname, stdio: 'inherit' });

  // Run Seed script
  console.log('🌱 Seeding initial data into `club.db`...');
  require('./prisma/seed.js');

  console.log('✨ `club.db` Database & Tables initialized successfully!');
} catch (err) {
  console.error('❌ Error initializing database:', err.message);
}
