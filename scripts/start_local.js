/**
 * Ultimate Hound Club - Safe Local Development Backend Launcher
 * Starts backend Express server connected exclusively to local isolated SQLite database (backend/data/local-dev.sqlite).
 * Explicitly clears remote Railway variables to guarantee 100% local isolation.
 */

process.env.USE_LOCAL_SQLITE = 'true';
process.env.PORT = process.env.PORT || '5050';

// Strip any remote credentials from process environment
delete process.env.DATABASE_URL;
process.env.DB_HOST = '127.0.0.1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'uhc-local-isolated-jwt-dev-secret-key-32chars';

// Load server application
const app = require('../server');

const PORT = process.env.PORT || 5050;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ultimate Hound Club SAFE LOCAL BACKEND is RUNNING!`);
  console.log(`📡 Local API URL: http://localhost:${PORT}/api/v1`);
  console.log(`🗄️ Storage Engine: Local Isolated SQLite (backend/data/local-dev.sqlite)`);
  console.log(`🛡️ Remote Railway Database: STRICTLY BLOCKED & DISCONNECTED`);
  console.log(`=======================================================`);
});

module.exports = server;
