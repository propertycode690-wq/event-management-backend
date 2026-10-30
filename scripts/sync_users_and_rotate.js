const mysql = require('../node_modules/mysql2/promise');
const bcrypt = require('../node_modules/bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const INSTANCE_A_URL = 'mysql://root:PRTPRVJMLydCnXnYRgazQxqOOCBhxIkz@centerbeam.proxy.rlwy.net:53549/railway';
const INSTANCE_B_URL = 'mysql://root:wwOyLdhgbawFdXEoeBrvXeUQIyjlxxSw@iriguchi.proxy.rlwy.net:58182/railway';

// Protected administrator emails whose passwords must NEVER be overwritten or reset
const PROTECTED_ADMIN_EMAILS = [
  'pancholelalit52@gmail.com'
];

async function run() {
  console.log('--- ADMIN SEED PASSWORD ROTATION & INSTANCE B SYNC ---');

  const poolA = mysql.createPool(INSTANCE_A_URL);
  const poolB = mysql.createPool(INSTANCE_B_URL);

  // 1. Fetch existing users from both instances
  const [usersA] = await poolA.query('SELECT * FROM User');
  const [usersB] = await poolB.query('SELECT * FROM User');

  console.log(`Instance A total users: ${usersA.length}`);
  console.log(`Instance B total users: ${usersB.length}`);

  const vault = {
    rotatedAt: new Date().toISOString(),
    protectedAdminsKeptIntact: PROTECTED_ADMIN_EMAILS,
    rotatedAccounts: []
  };

  // Generate strong random passwords for seed accounts
  // Rule: Do NOT print raw passwords to stdout / logs!
  const generateSecurePassword = () => {
    return 'UHC_' + crypto.randomBytes(8).toString('hex') + '!' + Math.floor(100 + Math.random() * 900);
  };

  // 2. Ensure role accounts exist in Instance B (copy from A if missing, except protected admins)
  for (const user of usersA) {
    if (PROTECTED_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.log(`[PRESERVED] Protected admin account untouched: ${user.email}`);
      continue;
    }

    const existsInB = usersB.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (!existsInB) {
      await poolB.query(
        `INSERT INTO User (id, email, passwordHash, name, role, phone, stateCode, clubId, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          user.id,
          user.email,
          user.passwordHash,
          user.name,
          user.role,
          user.phone || null,
          user.stateCode || null,
          user.clubId || null,
          user.status || 'Active'
        ]
      );
      console.log(`[SYNCED TO INSTANCE B] Added account: ${user.email} (${user.role})`);
    }
  }

  // 3. Now perform password rotation for all accounts that have password '12345678'
  // Both on Instance A and Instance B, strictly excluding PROTECTED_ADMIN_EMAILS
  const [allUsersB] = await poolB.query('SELECT * FROM User');

  for (const user of allUsersB) {
    if (PROTECTED_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      continue;
    }

    const isDefault = bcrypt.compareSync('12345678', user.passwordHash);
    if (isDefault) {
      const newPassword = generateSecurePassword();
      const newHash = bcrypt.hashSync(newPassword, 10);

      // Update Instance B
      await poolB.query('UPDATE User SET passwordHash = ?, updatedAt = NOW() WHERE id = ?', [newHash, user.id]);

      // Update Instance A if user exists there
      await poolA.query('UPDATE User SET passwordHash = ?, updatedAt = NOW() WHERE id = ?', [newHash, user.id]);

      vault.rotatedAccounts.push({
        id: user.id,
        email: user.email,
        role: user.role,
        rotatedPassword: newPassword, // stored strictly in private vault file
        previousPasswordWasDefault: true
      });

      console.log(`[ROTATED] ${user.email} (${user.role}) -> Default 12345678 eliminated`);
    }
  }

  // 4. Also check any remaining users in Instance A that might have 12345678
  const [remUsersA] = await poolA.query('SELECT * FROM User');
  for (const user of remUsersA) {
    if (PROTECTED_ADMIN_EMAILS.includes(user.email.toLowerCase())) continue;
    if (bcrypt.compareSync('12345678', user.passwordHash)) {
      const newPassword = generateSecurePassword();
      const newHash = bcrypt.hashSync(newPassword, 10);
      await poolA.query('UPDATE User SET passwordHash = ?, updatedAt = NOW() WHERE id = ?', [newHash, user.id]);
      vault.rotatedAccounts.push({
        id: user.id,
        email: user.email,
        role: user.role,
        rotatedPassword: newPassword,
        previousPasswordWasDefault: true
      });
      console.log(`[ROTATED ON A] ${user.email} (${user.role}) -> Default 12345678 eliminated`);
    }
  }

  // 5. Save secure credentials vault to private local file (NEVER committed to git)
  const vaultPath = path.resolve(__dirname, '../backups/rotated_credentials_vault.json');
  fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), 'utf8');
  console.log(`\n✅ Rotation complete! ${vault.rotatedAccounts.length} seed accounts securely rotated.`);
  console.log(`🔒 Vault written to: ${vaultPath} (Restricted access, credentials redacted from console)`);

  // 6. Verify zero accounts with 12345678 remain
  const [checkA] = await poolA.query('SELECT email, passwordHash FROM User');
  const [checkB] = await poolB.query('SELECT email, passwordHash FROM User');

  const defaultOnA = checkA.filter(u => bcrypt.compareSync('12345678', u.passwordHash)).length;
  const defaultOnB = checkB.filter(u => bcrypt.compareSync('12345678', u.passwordHash)).length;

  console.log(`Verification: Default '12345678' accounts on Instance A: ${defaultOnA}`);
  console.log(`Verification: Default '12345678' accounts on Instance B: ${defaultOnB}`);

  await poolA.end();
  await poolB.end();
}

run().catch(err => {
  console.error('Rotation error:', err);
  process.exit(1);
});

