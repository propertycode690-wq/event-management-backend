const path = require('path');
const fs = require('fs');

let pool;

/**
 * Creates an isolated SQLite connection pool with a mysql2/promise-compatible query() API.
 */
function createSqlitePool(dbFilePath, isTest = false) {
  const sqlite3 = require('sqlite3').verbose();
  const sqliteDb = new sqlite3.Database(dbFilePath);

  // Enforce foreign keys
  sqliteDb.run('PRAGMA foreign_keys = ON;');

  return {
    isTestDatabase: isTest,
    isLocalSqlite: true,
    dbPath: dbFilePath,
    _sqlite: sqliteDb,
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        const trimmed = (sql || '').trim();
        const upper = trimmed.toUpperCase();
        const safeParams = (params || []).map(p => (p === undefined ? null : p));

        if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('EXPLAIN')) {
          sqliteDb.all(trimmed, safeParams, (err, rows) => {
            if (err) return reject(err);
            resolve([rows || [], []]);
          });
        } else {
          sqliteDb.run(trimmed, safeParams, function (err) {
            if (err) return reject(err);
            resolve([{ affectedRows: this ? this.changes : 0, insertId: this ? this.lastID : null }, []]);
          });
        }
      });
    },
    close: () => {
      return new Promise((resolve, reject) => {
        sqliteDb.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  };
}

// 1. AUTOMATED TEST MODE (NODE_ENV === 'test')
if (process.env.NODE_ENV === 'test') {
  const host = (process.env.DB_HOST || '').toLowerCase();
  const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
  if (host.includes('rlwy.net') || host.includes('railway') || dbUrl.includes('rlwy.net') || dbUrl.includes('railway')) {
    throw new Error('FATAL SECURITY VIOLATION: Test suite attempted to connect to remote/Railway database. Execution blocked.');
  }

  // Uses dedicated test database file strictly isolated from development data
  const testDbFile = path.resolve(__dirname, 'tests', 'test_isolated.sqlite');
  pool = createSqlitePool(testDbFile, true);
}

// 2. STANDALONE LOCAL SQLITE DEVELOPMENT MODE (USE_LOCAL_SQLITE === 'true' or DB_DRIVER === 'sqlite')
else if (process.env.USE_LOCAL_SQLITE === 'true' || process.env.DB_DRIVER === 'sqlite') {
  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Uses dedicated local development database file completely separate from test DB
  const devDbFile = path.resolve(dataDir, 'local-dev.sqlite');
  pool = createSqlitePool(devDbFile, false);

  // Auto-initialize schema tables on startup if not present (without seeding privileged credentials)
  try {
    const { initializeTestSchema } = require('./tests/testSchema');
    initializeTestSchema(pool).catch(err => {
      console.warn('[Local SQLite Schema Init Note]:', err.message);
    });
  } catch (_) {}
}

// 3. MYSQL PRODUCTION / STAGING MODE
else {
  const host = (process.env.DB_HOST || '').toLowerCase();
  const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  // STARTUP VALIDATION: Block unintended remote/Railway database connection in local-development mode
  if (!isProduction && (host.includes('rlwy.net') || host.includes('railway') || dbUrl.includes('rlwy.net') || dbUrl.includes('railway'))) {
    throw new Error(
      'FATAL STARTUP BLOCKED: Development environment attempted to connect to a remote Railway production database.\n' +
      '  To run locally in safe, isolated development mode, use: npm run dev:local\n' +
      '  For automated testing against isolated database, use: npm test\n' +
      '  To start in verified production mode, explicitly set NODE_ENV=production.'
    );
  }

  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'club',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

module.exports = pool;


