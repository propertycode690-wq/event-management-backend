/**
 * Ultimate Hound Club - Critical Security Remediation & Test Isolation Suite
 * 
 * SAFE TEST ISOLATION GUARANTEES:
 * 1. Strictly runs against isolated local test SQLite database.
 * 2. Explicitly blocks execution if DB_HOST or DATABASE_URL points to Railway or remote database.
 * 3. Initializes fresh test schema and fixtures, with cleanup.
 * 
 * VULNERABILITY REMEDIATION VERIFICATION:
 * A. Club Claims: Protected listing & admin actions, validation, applicant privacy.
 * B. Membership Status: Protected status update, member self-activation prevention, scope enforcement.
 * C. User Profile: Authentication required, user can only update own profile, mass-assignment blocked.
 * D. Event Modification/Deletion: Auth + role required, scope isolation across clubs, 404 on missing.
 * E. Financial Reports: Super Admin / State Admin required, public routes restricted.
 * F. Role Changes & Unknown Routes: Role endpoint protected, unknown routes return structured HTTP 404.
 * G. Scope Query Isolation: Queries strictly filtered by state/club scope.
 * H. Honest Gateway & Sandbox: Payments clearly marked SIMULATED_TEST, no real charge.
 */

// Step 1: Force test environment before any module loads
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-isolated-jwt-secret-for-uhc-security-suite';
delete process.env.DATABASE_URL;
process.env.DB_HOST = '127.0.0.1';

const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const db = require('../db');
const { initializeTestSchema, seedTestFixtures } = require('./testSchema');
const app = require('../server');
const { getJwtSecret, JWT_SECRET } = require('../middlewares/authMiddleware');


let server;
let baseUrl;
const results = [];

function request(method, reqPath, body = null, token = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, baseUrl);
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(url, { method, headers }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(responseBody);
        } catch (_) {
          json = responseBody;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function assert(condition, testName, details = '') {
  if (condition) {
    results.push({ name: testName, passed: true, details });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.push({ name: testName, passed: false, details });
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('   ULTIMATE HOUND CLUB - CRITICAL SECURITY & TEST ISOLATION');
  console.log('================================================================\n');

  // Verify Safe Test Database Isolation
  console.log('[ISOLATION CHECK] Verifying database isolation safeguards...');
  assert(db.isTestDatabase === true, 'Test database is explicitly identified as isolated local test DB');
  assert(!db.dbPath.includes('rlwy.net'), 'Database path is strictly local file, zero connection to Railway');
  console.log(`  Isolated SQLite Test Database File: ${db.dbPath}\n`);

  // Initialize fresh schema and seed test fixtures
  await initializeTestSchema(db);
  await seedTestFixtures(db);
  console.log('  Isolated test schema & fixtures initialized.\n');

  // Start test server on dynamic/ephemeral port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Test server running locally on ${baseUrl}\n`);

  try {
    // Generate test tokens
    const superAdminToken = jwt.sign(
      { id: 'usr-super-admin', email: 'superadmin@example.com', name: 'Super Admin', role: 'SUPER_ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const memberToken = jwt.sign(
      { id: 'usr-regular-member', email: 'member@example.com', name: 'Regular Member', role: 'MEMBER', clubId: 'club-1', state: 'Tennessee' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const stateAdminToken = jwt.sign(
      { id: 'usr-state-admin', email: 'stateadmin@example.com', name: 'Texas State Admin', role: 'STATE_ADMIN', stateCode: 'TX', state: 'Texas' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const clubAdminToken = jwt.sign(
      { id: 'usr-club-admin', email: 'clubadmin@example.com', name: 'Oak Ridge Admin', role: 'CLUB_ADMIN', clubId: 'club-1', club: 'Oak Ridge Hunting Club' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // -----------------------------------------------------------------
    // SECTION 1: Database-Backed Registration, Login & Anti-Bypass
    // -----------------------------------------------------------------
    console.log('[1/9] Testing Database-Backed Registration, Login & Anti-Bypass...');
    const regEmail = `test.user.${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/v1/auth/register', {
      name: 'Auth Test User',
      email: regEmail,
      password: 'SecurePassword123!',
      role: 'SUPER_ADMIN', // Privilege escalation attempt
      phone: '(555) 019-9999'
    });
    assert(regRes.status === 201, 'Registration returns HTTP 201 Created');
    assert(regRes.body?.data?.user?.role === 'MEMBER', 'Self-registration defaults role to MEMBER (anti-escalation)');
    assert(Boolean(regRes.body?.data?.token), 'Registration returns valid JWT bearer token');

    // Login with registered credentials
    const loginRes = await request('POST', '/api/v1/auth/login', {
      email: regEmail,
      password: 'SecurePassword123!'
    });
    assert(loginRes.status === 200, 'Login with real DB credentials returns HTTP 200 OK');
    assert(loginRes.body?.data?.user?.email === regEmail, 'Login returns authenticated user record');

    // Rejection of non-existent user (no fake admin fallback)
    const fakeAdminRes = await request('POST', '/api/v1/auth/login', {
      email: 'nonexistent.user@fakeadmin.org',
      password: 'Password123!'
    });
    assert(fakeAdminRes.status === 401, 'Non-existent user rejected with HTTP 401 (no fake admin)');

    // Rejection of wrong password
    const wrongPassRes = await request('POST', '/api/v1/auth/login', {
      email: regEmail,
      password: 'WrongPassword999!'
    });
    assert(wrongPassRes.status === 401, 'Invalid password rejected with HTTP 401');

    // Rejection of master-password bypass "123"
    const masterPassBypassRes = await request('POST', '/api/v1/auth/login', {
      email: regEmail,
      password: '123'
    });
    assert(masterPassBypassRes.status === 401, 'Master password bypass "123" rejected with HTTP 401');

    // Profile verification (/auth/me)
    const unauthedMe = await request('GET', '/api/v1/auth/me');
    assert(unauthedMe.status === 401, 'Unauthenticated /auth/me rejected with HTTP 401');

    const authedMe = await request('GET', '/api/v1/auth/me', null, loginRes.body?.data?.token);
    assert(authedMe.status === 200, 'Authenticated /auth/me returns HTTP 200 profile');
    assert(authedMe.body?.data?.email === regEmail, 'Profile email matches authenticated user');

    // JWT Configuration: Fail-fast validation when JWT_SECRET is missing

    const originalTestSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    let missingSecretError = null;
    try {
      getJwtSecret();
    } catch (e) {
      missingSecretError = e;
    } finally {
      process.env.JWT_SECRET = originalTestSecret;
    }
    assert(Boolean(missingSecretError), 'Missing JWT_SECRET causes immediate fail-fast error');
    assert(missingSecretError?.message?.includes('FATAL CONFIGURATION ERROR'), 'Error message clearly identifies missing JWT_SECRET');

    // Negative test: Token signed with unauthorized/bogus secret rejected
    const bogusSecretToken = jwt.sign(
      { id: 'usr-attacker', email: 'attacker@evil.org', role: 'SUPER_ADMIN' },
      'unauthorized-fake-secret-do-not-trust',
      { expiresIn: '1h' }
    );
    const bogusAuthRes = await request('GET', '/api/v1/auth/me', null, bogusSecretToken);
    assert(bogusAuthRes.status === 401, 'Token signed with unconfigured/foreign secret rejected with HTTP 401');
    assert(bogusAuthRes.body?.error?.code === 'INVALID_TOKEN', 'Error code for forged token is INVALID_TOKEN');

    // -----------------------------------------------------------------
    // SECTION 2: Club Claims Authorization, Validation & Privacy
    // -----------------------------------------------------------------

    console.log('\n[2/9] Testing Club Claims Security & Authorization...');
    
    // Negative test: Unauthenticated listing rejected
    const unauthedClaimsGet = await request('GET', '/api/v1/club-claims');
    assert(unauthedClaimsGet.status === 401, 'Unauthenticated GET /api/v1/club-claims rejected with HTTP 401');

    // Negative test: Regular member listing rejected
    const memberClaimsGet = await request('GET', '/api/v1/club-claims', null, memberToken);
    assert(memberClaimsGet.status === 403, 'Regular member GET /api/v1/club-claims rejected with HTTP 403 Forbidden');

    // Positive test: Super Admin listing succeeds
    const adminClaimsGet = await request('GET', '/api/v1/club-claims', null, superAdminToken);
    assert(adminClaimsGet.status === 200, 'Super Admin GET /api/v1/club-claims succeeds with HTTP 200');
    assert(Array.isArray(adminClaimsGet.body?.data), 'Claims response returns array of claims');

    // Public claim submission: Valid input succeeds
    const newClaimRes = await request('POST', '/api/v1/club-claims', {
      id: 'CLM-TEST-001',
      club: 'Lone Star Hunting Association',
      state: 'TX',
      applicant: 'John Hunter',
      email: 'jhunter@example.com',
      phone: '(555) 777-8888',
      message: 'Official charter registration.'
    });
    assert(newClaimRes.status === 201, 'Public POST /api/v1/club-claims succeeds with HTTP 201');
    assert(newClaimRes.body?.data?.claimStatus === 'Pending', 'New claim starts in Pending status');

    // Negative test: Public claim submission fails when required fields are missing
    const invalidClaimRes = await request('POST', '/api/v1/club-claims', {
      message: 'Incomplete submission without club name'
    });
    assert(invalidClaimRes.status === 400, 'POST /api/v1/club-claims rejects missing required fields with HTTP 400');

    // Negative test: Unauthenticated status update rejected
    const unauthedClaimUpdate = await request('PUT', '/api/v1/club-claims/CLM-TEST-001', { claimStatus: 'Approved' });
    assert(unauthedClaimUpdate.status === 401, 'Unauthenticated PUT /api/v1/club-claims/:id rejected with HTTP 401');

    // Negative test: Member status update rejected
    const memberClaimUpdate = await request('PUT', '/api/v1/club-claims/CLM-TEST-001', { claimStatus: 'Approved' }, memberToken);
    assert(memberClaimUpdate.status === 403, 'Member PUT /api/v1/club-claims/:id rejected with HTTP 403 Forbidden');

    // Negative test: Super Admin submitting invalid status rejected
    const invalidStatusClaimUpdate = await request('PUT', '/api/v1/club-claims/CLM-TEST-001', { claimStatus: 'SUPER_ACTIVE' }, superAdminToken);
    assert(invalidStatusClaimUpdate.status === 400, 'Super Admin submitting invalid claim status rejected with HTTP 400');

    // Positive test: Super Admin approving claim succeeds
    const adminClaimUpdate = await request('PUT', '/api/v1/club-claims/CLM-TEST-001', { claimStatus: 'Approved' }, superAdminToken);
    assert(adminClaimUpdate.status === 200, 'Super Admin PUT /api/v1/club-claims/:id succeeds with HTTP 200');
    assert(adminClaimUpdate.body?.data?.claimStatus === 'Approved', 'Claim status successfully updated to Approved');

    // Persistence verification: Direct database query verifies claim status
    const [persistedClaimRows] = await db.query('SELECT * FROM `ClubClaim` WHERE id = ?', ['CLM-TEST-001']);
    assert(persistedClaimRows.length === 1, 'Claim record persists in database');
    assert(persistedClaimRows[0].claimStatus === 'Approved', 'Database confirms claimStatus is Approved');
    assert(persistedClaimRows[0].verificationStatus === 'Verified Official', 'Database confirms verificationStatus is Verified Official');

    // Authenticated claim submission persists and does NOT grant administrative role
    const authClaimRes = await request('POST', '/api/v1/club-claims', {
      id: 'CLM-AUTH-001',
      club: 'Smoky Mountain Kennel Club',
      state: 'TN',
      applicant: 'Regular Member',
      email: 'member@example.com',
      phone: '(555) 000-0002',
      message: 'Submitting official club administration application.'
    }, memberToken);
    assert(authClaimRes.status === 201, 'Authenticated POST /api/v1/club-claims succeeds with HTTP 201');
    assert(authClaimRes.body?.data?.claimStatus === 'Pending', 'Authenticated claim starts in Pending status');

    // Privilege Escalation Guard: Submitting claim does NOT alter claimant's role in database
    const [userAfterClaim] = await db.query('SELECT role FROM `User` WHERE id = ?', ['usr-regular-member']);
    assert(userAfterClaim[0].role === 'MEMBER', 'Claim submission does NOT grant administrative role to claimant');

    // Duplicate active claim handling: Reject second active claim for same organization
    const dupActiveClaimRes = await request('POST', '/api/v1/club-claims', {
      id: 'CLM-AUTH-DUP',
      club: 'Smoky Mountain Kennel Club',
      state: 'TN',
      applicant: 'Another Claimant',
      email: 'another@example.com',
      phone: '(555) 111-2222',
      message: 'Duplicate claim attempt.'
    });
    assert(dupActiveClaimRes.status === 409, 'Duplicate active claim for same organization rejected with HTTP 409');
    assert(dupActiveClaimRes.body?.error?.code === 'DUPLICATE_ACTIVE_CLAIM', 'Error code is DUPLICATE_ACTIVE_CLAIM');

    // Duplicate ID handling: Reject claim with existing ID
    const dupIdClaimRes = await request('POST', '/api/v1/club-claims', {
      id: 'CLM-AUTH-001',
      club: 'Unique Different Club',
      state: 'TX',
      applicant: 'Different Person',
      email: 'diff@example.com',
      phone: '(555) 333-4444'
    });
    assert(dupIdClaimRes.status === 409, 'Duplicate claim ID rejected with HTTP 409');
    assert(dupIdClaimRes.body?.error?.code === 'DUPLICATE_CLAIM', 'Error code is DUPLICATE_CLAIM');

    // Claimant self-approval prevention: Super Admin submits claim under their email
    const selfClaimRes = await request('POST', '/api/v1/club-claims', {
      id: 'CLM-SELF-001',
      club: 'Highland Hunting Club',
      state: 'TX',
      applicant: 'Super Admin',
      email: 'superadmin@example.com',
      phone: '(555) 000-0001',
      message: 'Self-claim by super admin.'
    }, superAdminToken);
    assert(selfClaimRes.status === 201, 'Self-claim submission succeeds with HTTP 201');

    // Super Admin attempting to approve their own claim is strictly blocked
    const selfApprovalRes = await request('PUT', '/api/v1/club-claims/CLM-SELF-001', { claimStatus: 'Approved' }, superAdminToken);
    assert(selfApprovalRes.status === 403, 'Claimant attempting to approve their own claim rejected with HTTP 403 Forbidden');
    assert(selfApprovalRes.body?.error?.code === 'SELF_APPROVAL_FORBIDDEN', 'Self-approval error code is SELF_APPROVAL_FORBIDDEN');

    // Updating non-existent claim ID returns 404
    const missingClaimRes = await request('PUT', '/api/v1/club-claims/CLM-NONEXISTENT', { claimStatus: 'Approved' }, superAdminToken);
    assert(missingClaimRes.status === 404, 'Updating non-existent claim ID returns HTTP 404 Not Found');

    // Role Management Security: Member cannot alter administrative roles
    const memberRoleUpdateRes = await request('PUT', '/api/v1/users/usr-regular-member/role', { role: 'SUPER_ADMIN' }, memberToken);
    assert(memberRoleUpdateRes.status === 403, 'Member attempting PUT /api/v1/users/:id/role rejected with HTTP 403 Forbidden');

    // Role Management Security: Super admin submitting invalid role is rejected
    const invalidRoleRes = await request('PUT', '/api/v1/users/usr-regular-member/role', { role: 'HACKER_ADMIN' }, superAdminToken);
    assert(invalidRoleRes.status === 400, 'Invalid role value rejected with HTTP 400 Bad Request');

    // Role Management Security: Updating non-existent user returns 404
    const missingUserRoleRes = await request('PUT', '/api/v1/users/usr-nonexistent/role', { role: 'CLUB_ADMIN' }, superAdminToken);
    assert(missingUserRoleRes.status === 404, 'Updating role on nonexistent user returns HTTP 404 Not Found');

    // Authorized Role Management: Super Admin updates user role successfully
    const adminRoleUpdateRes = await request('PUT', '/api/v1/users/usr-regular-member/role', { role: 'CLUB_ADMIN' }, superAdminToken);
    assert(adminRoleUpdateRes.status === 200, 'Super Admin updating user role succeeds with HTTP 200');
    assert(adminRoleUpdateRes.body?.role === 'CLUB_ADMIN', 'Response confirms new role is CLUB_ADMIN');
    const [userDbRole] = await db.query('SELECT role FROM `User` WHERE id = ?', ['usr-regular-member']);
    assert(userDbRole[0].role === 'CLUB_ADMIN', 'Database confirms persisted user role update');
    // Revert role back to MEMBER for subsequent test integrity
    await db.query('UPDATE `User` SET `role` = ? WHERE `id` = ?', ['MEMBER', 'usr-regular-member']);

    // Canonical alias verification: POST /api/v1/clubs/claims delegates to canonical handler
    const aliasClaimRes = await request('POST', '/api/v1/clubs/claims', {
      id: 'CLM-ALIAS-001',
      club: 'Bluegrass Sportsman Club',
      state: 'KY',
      applicant: 'Bluegrass Leader',
      email: 'leader@bluegrass.org',
      phone: '(555) 444-5555',
      message: 'Application via canonical club claims alias.'
    });
    assert(aliasClaimRes.status === 201, 'POST /api/v1/clubs/claims succeeds with HTTP 201');
    assert(aliasClaimRes.body?.data?.claimStatus === 'Pending', 'Alias claim persisted in Pending status');
    const [aliasDbRows] = await db.query('SELECT * FROM `ClubClaim` WHERE id = ?', ['CLM-ALIAS-001']);
    assert(aliasDbRows.length === 1, 'Database confirms persistence via canonical alias endpoint');

    // -----------------------------------------------------------------
    // SECTION 2B: Local Club Modification Security & Scope Enforcement (Fix 1)
    // -----------------------------------------------------------------
    console.log('\n[2B] Testing Local Club Modification Security & Scope Enforcement...');

    // 1. Unauthenticated update attempt rejected with HTTP 401
    const unauthedClubUpdate = await request('PUT', '/api/v1/clubs/club-1', { name: 'Hacked Club Name' });
    assert(unauthedClubUpdate.status === 401, 'Unauthenticated PUT /api/v1/clubs/:id rejected with HTTP 401');

    // 2. Token signed with wrong/bogus secret rejected with HTTP 401
    const bogusClubUpdate = await request('PUT', '/api/v1/clubs/club-1', { name: 'Hacked Club Name' }, bogusSecretToken);
    assert(bogusClubUpdate.status === 401, 'Invalid token PUT /api/v1/clubs/:id rejected with HTTP 401');

    // 3. Ordinary member update attempt rejected with HTTP 403 Forbidden
    const memberClubUpdate = await request('PUT', '/api/v1/clubs/club-1', { name: 'Member Renamed Club' }, memberToken);
    assert(memberClubUpdate.status === 403, 'Member PUT /api/v1/clubs/:id rejected with HTTP 403 Forbidden');

    // 4. Club Admin attempting to update a club outside their assigned club (club-2) rejected with HTTP 403
    const clubAdminWrongClub = await request('PUT', '/api/v1/clubs/club-2', { name: 'Club Admin Rogue Update' }, clubAdminToken);
    assert(clubAdminWrongClub.status === 403, 'Club Admin modifying club outside assigned scope (club-2) rejected with HTTP 403');

    // 5. Club Admin modifying their own assigned club (club-1) succeeds with HTTP 200
    const clubAdminOwnClub = await request('PUT', '/api/v1/clubs/club-1', { city: 'Oak Ridge City' }, clubAdminToken);
    assert(clubAdminOwnClub.status === 200, 'Club Admin modifying own club (club-1) succeeds with HTTP 200');

    // 6. State Admin (Texas) modifying a club outside their state (club-1 in TN) rejected with HTTP 403
    const stateAdminWrongState = await request('PUT', '/api/v1/clubs/club-1', { city: 'Unauthorized State Edit' }, stateAdminToken);
    assert(stateAdminWrongState.status === 403, 'State Admin modifying club outside assigned state charter rejected with HTTP 403');

    // 7. State Admin (Texas) modifying a club within their state (club-tx-1 in TX) succeeds with HTTP 200
    const stateAdminOwnState = await request('PUT', '/api/v1/clubs/club-tx-1', { city: 'Austin Capital' }, stateAdminToken);
    assert(stateAdminOwnState.status === 200, 'State Admin modifying club within assigned state charter succeeds with HTTP 200');

    // 8. Super Admin can update any club across the national network
    const superAdminClubUpdate = await request('PUT', '/api/v1/clubs/club-2', { adminName: 'Super Admin Assigned' }, superAdminToken);
    assert(superAdminClubUpdate.status === 200, 'Super Admin modifying club succeeds with HTTP 200');

    // 9. Updating nonexistent club returns HTTP 404 Not Found
    const nonexistentClubUpdate = await request('PUT', '/api/v1/clubs/club-nonexistent-404', { name: 'Ghost Club' }, superAdminToken);
    assert(nonexistentClubUpdate.status === 404, 'Updating nonexistent club ID returns HTTP 404 Not Found');

    // -----------------------------------------------------------------
    // SECTION 3: Membership Status & Self-Activation Prevention
    // -----------------------------------------------------------------

    console.log('\n[3/9] Testing Membership Status Authorization & Self-Activation Prevention...');

    // Honest initial status on member creation
    const newMemberRes = await request('POST', '/api/v1/members', {
      name: 'Unverified Candidate',
      email: 'candidate@example.com',
      phone: '(555) 999-0001',
      state: 'Tennessee',
      club: 'Oak Ridge Hunting Club'
    });
    assert(newMemberRes.status === 201, 'POST /api/v1/members returns HTTP 201');
    assert(newMemberRes.body?.data?.status === 'Pending Payment Verification', 'Membership status strictly defaults to Pending Payment Verification');
    const candidateId = newMemberRes.body?.data?.id;

    // Negative test: Unauthenticated status update rejected
    const unauthedStatusUpdate = await request('PUT', `/api/v1/members/${candidateId}/status`, { status: 'Active' });
    assert(unauthedStatusUpdate.status === 401, 'Unauthenticated PUT /api/v1/members/:id/status rejected with HTTP 401');

    // Negative test: Regular member attempting to activate membership rejected
    const memberSelfActivate = await request('PUT', `/api/v1/members/${candidateId}/status`, { status: 'Active' }, memberToken);
    assert(memberSelfActivate.status === 403, 'Regular member attempting to activate membership rejected with HTTP 403 Forbidden');

    // Negative test: Invalid status string rejected
    const invalidMemberStatus = await request('PUT', `/api/v1/members/${candidateId}/status`, { status: 'BypassedPayment' }, superAdminToken);
    assert(invalidMemberStatus.status === 400, 'Admin submitting invalid membership status rejected with HTTP 400');

    // Negative test: Scope isolation - State Admin (Texas) cannot update Tennessee member
    const outOfScopeStatusUpdate = await request('PUT', `/api/v1/members/${candidateId}/status`, { status: 'Active' }, stateAdminToken);
    assert(outOfScopeStatusUpdate.status === 403, 'State Admin (TX) modifying member outside assigned state (TN) rejected with HTTP 403');

    // Positive test: Super Admin updating status succeeds
    const superAdminStatusUpdate = await request('PUT', `/api/v1/members/${candidateId}/status`, { status: 'Active' }, superAdminToken);
    assert(superAdminStatusUpdate.status === 200, 'Authorized Super Admin PUT /api/v1/members/:id/status succeeds with HTTP 200');
    assert(superAdminStatusUpdate.body?.data?.status === 'Active' || superAdminStatusUpdate.body?.status === 'Active', 'Member status updated to Active by authorized admin');

    // -----------------------------------------------------------------
    // SECTION 4: User Profile Modification & Mass Assignment Protection
    // -----------------------------------------------------------------
    console.log('\n[4/9] Testing User Profile Modification & Mass-Assignment Protection...');

    // Negative test: Unauthenticated profile update rejected
    const unauthedProfileUpdate = await request('PUT', '/api/v1/users/usr-regular-member/profile', { name: 'Hacked Name' });
    assert(unauthedProfileUpdate.status === 401, 'Unauthenticated PUT /api/v1/users/:id/profile rejected with HTTP 401');

    // Negative test: User attempting to modify another user's profile rejected
    const crossUserProfileUpdate = await request('PUT', '/api/v1/users/usr-super-admin/profile', { name: 'Compromised Admin' }, memberToken);
    assert(crossUserProfileUpdate.status === 403, 'Member modifying another user profile rejected with HTTP 403 Forbidden');

    // Positive test: User modifying own permitted profile fields succeeds
    const ownProfileUpdate = await request('PUT', '/api/v1/users/usr-regular-member/profile', {
      name: 'Updated Member Name',
      phone: '(555) 999-1234',
      stateCode: 'TN',
      // Privilege escalation attempt in body:
      role: 'SUPER_ADMIN',
      passwordHash: 'injected_hash'
    }, memberToken);
    assert(ownProfileUpdate.status === 200, 'User modifying own profile succeeds with HTTP 200');
    assert(ownProfileUpdate.body?.data?.name === 'Updated Member Name', 'Profile name updated successfully');
    assert(ownProfileUpdate.body?.data?.role === 'MEMBER', 'Role modification strictly blocked (mass-assignment prevented)');

    // Verify in database that role was NOT changed
    const [dbUserRows] = await db.query('SELECT role FROM `User` WHERE id = ?', ['usr-regular-member']);
    assert(dbUserRows[0]?.role === 'MEMBER', 'Database confirms role remains MEMBER after update attempt');

    // -----------------------------------------------------------------
    // SECTION 5: Event Modification, Deletion & Scope Isolation
    // -----------------------------------------------------------------
    console.log('\n[5/9] Testing Event Modification, Deletion & Scope Isolation...');

    // Public endpoints remain accessible
    const publicEventsGet = await request('GET', '/api/v1/events');
    assert(publicEventsGet.status === 200, 'Public GET /api/v1/events remains accessible (HTTP 200)');
    assert(Array.isArray(publicEventsGet.body?.data), 'Public events endpoint returns array');

    const publicEventDetail = await request('GET', '/api/v1/events/evt-1');
    assert(publicEventDetail.status === 200, 'Public GET /api/v1/events/:id remains accessible (HTTP 200)');

    // Negative test: Unauthenticated event update rejected
    const unauthedEventUpdate = await request('PUT', '/api/v1/events/evt-1', { name: 'Hacked Event' });
    assert(unauthedEventUpdate.status === 401, 'Unauthenticated PUT /api/v1/events/:id rejected with HTTP 401');

    // Negative test: Regular member event update rejected
    const memberEventUpdate = await request('PUT', '/api/v1/events/evt-1', { name: 'Member Event' }, memberToken);
    assert(memberEventUpdate.status === 403, 'Regular member PUT /api/v1/events/:id rejected with HTTP 403 Forbidden');

    // Scope isolation test: Club Admin for club-1 modifying evt-2 (club-2) rejected
    const outOfScopeEventUpdate = await request('PUT', '/api/v1/events/evt-2', { name: 'Unauthorized Modify' }, clubAdminToken);
    assert(outOfScopeEventUpdate.status === 403, 'Club Admin modifying event outside club scope (evt-2) rejected with HTTP 403');

    // Positive test: Club Admin modifying own club's event (evt-1) succeeds
    const inScopeEventUpdate = await request('PUT', '/api/v1/events/evt-1', { name: 'Oak Ridge Grand Hunt (Updated)' }, clubAdminToken);
    assert(inScopeEventUpdate.status === 200, 'Club Admin modifying own event (evt-1) succeeds with HTTP 200');
    assert(inScopeEventUpdate.body?.data?.name === 'Oak Ridge Grand Hunt (Updated)', 'Event name updated successfully in database');

    // Negative test: Modifying non-existent event returns 404
    const nonExistentEventUpdate = await request('PUT', '/api/v1/events/evt-nonexistent-999', { name: 'Ghost' }, superAdminToken);
    assert(nonExistentEventUpdate.status === 404, 'Updating non-existent event ID returns HTTP 404 Not Found');

    // Scope isolation test: Club Admin deleting event outside scope rejected
    const outOfScopeDelete = await request('DELETE', '/api/v1/events/evt-2', null, clubAdminToken);
    assert(outOfScopeDelete.status === 403, 'Club Admin deleting event outside club scope rejected with HTTP 403 Forbidden');

    // Negative test: Deleting non-existent event returns 404
    const nonExistentEventDelete = await request('DELETE', '/api/v1/events/evt-nonexistent-999', null, superAdminToken);
    assert(nonExistentEventDelete.status === 404, 'Deleting non-existent event ID returns HTTP 404 Not Found');

    // -----------------------------------------------------------------
    // SECTION 6: Financial Reports Authorization
    // -----------------------------------------------------------------
    console.log('\n[6/9] Testing Financial Reports Authorization...');

    // Negative test: Unauthenticated financial overview rejected
    const unauthedReports = await request('GET', '/api/v1/reports/financial-overview');
    assert(unauthedReports.status === 401, 'Unauthenticated GET /api/v1/reports/financial-overview rejected with HTTP 401');

    // Negative test: Member accessing financial overview rejected
    const memberReports = await request('GET', '/api/v1/reports/financial-overview', null, memberToken);
    assert(memberReports.status === 403, 'Member accessing /api/v1/reports/financial-overview rejected with HTTP 403 Forbidden');

    // Positive test: Super Admin accessing financial overview succeeds and matches real database calculations
    const adminReports = await request('GET', '/api/v1/reports/financial-overview?period=all', null, superAdminToken);
    assert(adminReports.status === 200, 'Super Admin accessing /api/v1/reports/financial-overview succeeds with HTTP 200');
    assert(adminReports.body?.data?.summary?.merchandiseRevenue === 235.49, 'Merchandise revenue calculated from real orders (89.99 + 145.50 = 235.49)');
    assert(adminReports.body?.data?.summary?.eventsRevenue === 45.00, 'Events revenue calculated from real paid event entries (45.00)');
    assert(adminReports.body?.data?.summary?.membershipRevenue === 105.00, 'Membership revenue calculated from active members (35.00 * 3 = 105.00)');
    assert(adminReports.body?.data?.summary?.totalRevenue === 385.49, 'Total revenue is exact mathematical sum (385.49)');

    // Scoped test: Club Admin accessing financial overview is strictly scoped to club-1
    const clubAdminReports = await request('GET', '/api/v1/reports/financial-overview?period=all', null, clubAdminToken);
    assert(clubAdminReports.status === 200, 'Club Admin accessing /api/v1/reports/financial-overview succeeds with HTTP 200');
    assert(clubAdminReports.body?.data?.summary?.merchandiseRevenue === 89.99, 'Club Admin only receives own club merchandise revenue (89.99)');
    assert(clubAdminReports.body?.data?.summary?.eventsRevenue === 0.00, 'Club Admin events revenue is 0.00 (ent-1 is Pending Payment)');
    assert(clubAdminReports.body?.data?.summary?.membershipRevenue === 70.00, 'Club Admin receives only own club active members revenue (35.00 * 2 = 70.00)');
    assert(clubAdminReports.body?.data?.summary?.totalRevenue === 159.99, 'Club Admin total revenue is scoped to club-1 (159.99)');

    // Scoped test: Club Admin attempting to access another club's reports is rejected
    const outOfScopeClubReport = await request('GET', '/api/v1/reports/financial-overview?clubId=club-2', null, clubAdminToken);
    assert(outOfScopeClubReport.status === 403, 'Club Admin accessing another club report rejected with HTTP 403 Forbidden');

    // Scoped test: State Admin accessing financial overview is strictly scoped to Texas (TX)
    const stateAdminReports = await request('GET', '/api/v1/reports/financial-overview?period=all', null, stateAdminToken);
    assert(stateAdminReports.status === 200, 'State Admin accessing financial overview succeeds with HTTP 200');
    assert(stateAdminReports.body?.data?.summary?.merchandiseRevenue === 0.00, 'State Admin receives 0.00 merch revenue for TX (no TX orders in fixtures)');
    assert(stateAdminReports.body?.data?.summary?.membershipRevenue === 35.00, 'State Admin receives only TX member revenue (35.00 for mem-tx)');
    assert(stateAdminReports.body?.data?.summary?.totalRevenue === 35.00, 'State Admin total revenue is scoped strictly to Texas');

    // Scoped test: State Admin attempting to access another state's reports is rejected
    const outOfScopeStateReport = await request('GET', '/api/v1/reports/financial-overview?state=KY', null, stateAdminToken);
    assert(outOfScopeStateReport.status === 403, 'State Admin accessing another state report rejected with HTTP 403 Forbidden');

    // Date filtering tests:
    // 1. Invalid date format returns HTTP 400
    const invalidDateReport = await request('GET', '/api/v1/reports/financial-overview?startDate=not-a-valid-date', null, superAdminToken);
    assert(invalidDateReport.status === 400, 'Invalid startDate returns HTTP 400 Bad Request');
    assert(invalidDateReport.body?.error?.code === 'INVALID_DATE_FORMAT', 'Error code is INVALID_DATE_FORMAT');

    // 2. Inverted date range returns HTTP 400
    const invertedDateReport = await request('GET', '/api/v1/reports/financial-overview?startDate=2026-12-31&endDate=2026-01-01', null, superAdminToken);
    assert(invertedDateReport.status === 400, 'Inverted date range returns HTTP 400 Bad Request');
    assert(invertedDateReport.body?.error?.code === 'INVALID_DATE_RANGE', 'Error code is INVALID_DATE_RANGE');

    // 3. Past date range where no records exist returns 0.00 without crashing
    const pastDateReport = await request('GET', '/api/v1/reports/financial-overview?period=custom&startDate=2020-01-01&endDate=2020-01-31', null, superAdminToken);
    assert(pastDateReport.status === 200, 'Past date range returns HTTP 200');
    assert(pastDateReport.body?.data?.summary?.totalRevenue === 0, 'Past date range with zero matches returns 0 totalRevenue');

    // State Performance Report Tests:
    // Unauthenticated rejected
    const unauthedStatePerf = await request('GET', '/api/v1/reports/state-performance');
    assert(unauthedStatePerf.status === 401, 'Unauthenticated GET /api/v1/reports/state-performance rejected with HTTP 401');

    // Member rejected
    const memberStatePerf = await request('GET', '/api/v1/reports/state-performance', null, memberToken);
    assert(memberStatePerf.status === 403, 'Member accessing /api/v1/reports/state-performance rejected with HTTP 403 Forbidden');

    // State Admin accessing own state (TX) succeeds
    const stateAdminPerf = await request('GET', '/api/v1/reports/state-performance', null, stateAdminToken);
    assert(stateAdminPerf.status === 200, 'State Admin accessing /api/v1/reports/state-performance succeeds with HTTP 200');
    assert(stateAdminPerf.body?.data?.stateCode === 'TX', 'State Admin receives TX performance report');

    // State Admin accessing another state (KY) rejected with 403
    const stateAdminOutScopePerf = await request('GET', '/api/v1/reports/state-performance?state=KY', null, stateAdminToken);
    assert(stateAdminOutScopePerf.status === 403, 'State Admin accessing another state performance rejected with HTTP 403');

    // Super Admin accessing TN state performance returns live DB counts
    const tnStatePerf = await request('GET', '/api/v1/reports/state-performance?state=TN', null, superAdminToken);
    assert(tnStatePerf.status === 200, 'Super Admin querying TN state performance succeeds with HTTP 200');
    assert(tnStatePerf.body?.data?.clubsCount === 1, 'TN performance report returns live database clubs count (1)');
    assert(tnStatePerf.body?.data?.activeMembers === 2, 'TN performance report returns live database active members (2)');
    assert(tnStatePerf.body?.data?.totalStateRevenue === 185000, 'TN performance report returns database state revenue');

    // Non-existent state returns 404 Not Found (no fake fallback!)
    const nonExistentStatePerf = await request('GET', '/api/v1/reports/state-performance?state=NONEXISTENT_STATE_XYZ', null, superAdminToken);
    assert(nonExistentStatePerf.status === 404, 'Non-existent state performance report returns HTTP 404 Not Found');

    // Revenue Commissions Report Tests:
    // Unauthenticated rejected
    const unauthedRevComm = await request('GET', '/api/v1/reports/revenue-commissions');
    assert(unauthedRevComm.status === 401, 'Unauthenticated GET /api/v1/reports/revenue-commissions rejected with HTTP 401');

    // Member rejected
    const memberRevComm = await request('GET', '/api/v1/reports/revenue-commissions', null, memberToken);
    assert(memberRevComm.status === 403, 'Member accessing /api/v1/reports/revenue-commissions rejected with HTTP 403 Forbidden');

    // State Admin (TX) accessing another state (TN) rejected with 403
    const outScopeRevComm = await request('GET', '/api/v1/reports/revenue-commissions?state=TN', null, stateAdminToken);
    assert(outScopeRevComm.status === 403, 'State Admin accessing another state commissions rejected with HTTP 403 Forbidden');

    // Super Admin querying TN revenue commissions returns live database order metrics
    const tnRevComm = await request('GET', '/api/v1/reports/revenue-commissions?state=TN', null, superAdminToken);
    assert(tnRevComm.status === 200, 'Super Admin querying TN revenue commissions succeeds with HTTP 200');
    assert(tnRevComm.body?.data?.totalMerchSales === 89.99, 'TN commission report totalMerchSales is 89.99 (from ord-1 in club-1)');
    assert(tnRevComm.body?.data?.stateCommissionEarned === 6.30, 'TN commission earned is 7% of actual sales (6.30)');
    assert(tnRevComm.body?.data?.pendingPayouts === 6.30, 'TN pending payout is 6.30 (ord-1 payoutStatus is Pending)');
    assert(tnRevComm.body?.data?.payoutStatus === 'Pending', 'TN payout status correctly reports Pending');
    assert(tnRevComm.body?.data?.ledgerEntriesCount === 1, 'TN ledger entries count is 1');

    // Non-existent state commissions returns 404
    const nonExistentRevComm = await request('GET', '/api/v1/reports/revenue-commissions?state=ZZZ', null, superAdminToken);
    assert(nonExistentRevComm.status === 404, 'Non-existent state commission report returns HTTP 404 Not Found');

    // Phase 8.1: Financial Calculation Integrity & Ledger Transparency Verifications
    // 1. Verify report metadata explicitly identifies ledger basis and unverified bank transfers
    assert(adminReports.body?.data?.metadata?.membershipAccrualBasis === 'Active Membership Roster Dues', 'Report metadata identifies membership revenue as active roster dues accrual');
    assert(adminReports.body?.data?.metadata?.bankTransferVerified === false, 'Report metadata honestly states bank transfers are not verified');
    assert(adminReports.body?.data?.metadata?.disbursementType === 'Internal Ledger', 'Report metadata honestly states disbursement type is Internal Ledger');

    // 2. Verify commissions report provides completedPayouts and ledger transparency
    assert(tnRevComm.body?.data?.completedPayouts === 0.00, 'TN commission report completedPayouts is 0.00 when no payouts are Paid/Completed');
    assert(tnRevComm.body?.data?.disbursementType === 'Internal Ledger', 'Commission report identifies disbursement as internal ledger');
    assert(tnRevComm.body?.data?.bankTransferVerified === false, 'Commission report confirms external bank transfer is not verified');

    // 3. National Admin Overview endpoint (/api/v1/national) returns real computed total with YTD boundaries
    const nationalOverview = await request('GET', '/api/v1/national');
    assert(nationalOverview.status === 200, 'GET /api/v1/national returns HTTP 200');
    assert(nationalOverview.body?.data?.nationalRevenueYTD === 385.49, 'nationalRevenueYTD is computed from real DB records (385.49)');
    assert(nationalOverview.body?.data?.totalStates === 3, 'totalStates matches database count (3)');
    assert(nationalOverview.body?.data?.totalClubs === 3, 'totalClubs matches database count (3)');
    assert(nationalOverview.body?.data?.totalActiveMembers === 3, 'totalActiveMembers matches database count of active members (3)');
    assert(nationalOverview.body?.data?.year === new Date().getUTCFullYear(), 'national overview reports current UTC year');
    assert(nationalOverview.body?.data?.ytdStartDate === `${new Date().getUTCFullYear()}-01-01`, 'national overview enforces YTD start date boundary');

    // 4. Commissions Governance endpoint (/api/v1/commissions) returns real computed total with ledger transparency
    const commissionsOverview = await request('GET', '/api/v1/commissions');
    assert(commissionsOverview.status === 200, 'GET /api/v1/commissions returns HTTP 200');
    assert(commissionsOverview.body?.data?.totalDisbursedYTD === 0, 'totalDisbursedYTD is 0 when no orders have Paid/Completed status');
    assert(commissionsOverview.body?.data?.disbursementType === 'Internal Ledger', 'commissions governance identifies disbursements as Internal Ledger');
    assert(commissionsOverview.body?.data?.bankTransferVerified === false, 'commissions governance confirms external bank transfer is not verified');

    // 5. Integrity Verification: Cancelled and Refunded orders are excluded from merchandise revenue
    await db.query(
      "INSERT INTO `Order` (id, orderNumber, customerName, total, status, fulfillmentStatus, payoutStatus, clubId) VALUES ('ord-test-cancelled', 'ORD-CAN-1', 'Cancelled Customer', 200.00, 'Cancelled', 'Cancelled', 'Rejected', 'club-1')"
    );
    await db.query(
      "INSERT INTO `Order` (id, orderNumber, customerName, total, status, fulfillmentStatus, payoutStatus, clubId) VALUES ('ord-test-refunded', 'ORD-REF-1', 'Refunded Customer', 300.00, 'Refunded', 'Refunded', 'Rejected', 'club-1')"
    );
    const postCancelReport = await request('GET', '/api/v1/reports/financial-overview?period=all', null, superAdminToken);
    assert(postCancelReport.body?.data?.summary?.merchandiseRevenue === 235.49, 'Cancelled and Refunded orders are strictly excluded from merchandise revenue');
    await db.query("DELETE FROM `Order` WHERE id IN ('ord-test-cancelled', 'ord-test-refunded')");

    // 6. Integrity Verification: Unverified event entry payments (Pending Payment / Unpaid) are excluded from event revenue
    await db.query(
      "INSERT INTO EventEntry (id, eventId, dogId, participant, fee, paymentStatus, confirmationCode) VALUES ('ent-unverified-1', 'evt-1', 'dog-999', 'Unverified Participant', 100.00, 'Pending Payment', 'UHC-CONF-TEST-1')"
    );
    await db.query(
      "INSERT INTO EventEntry (id, eventId, dogId, participant, fee, paymentStatus, confirmationCode) VALUES ('ent-unverified-2', 'evt-1', 'dog-998', 'Unpaid Participant', 150.00, 'Unpaid', 'UHC-CONF-TEST-2')"
    );
    const postEntryReport = await request('GET', '/api/v1/reports/financial-overview?period=all', null, superAdminToken);
    assert(postEntryReport.body?.data?.summary?.eventsRevenue === 45.00, 'Unverified event payments (Pending Payment/Unpaid) are strictly excluded from event revenue');
    await db.query("DELETE FROM EventEntry WHERE id IN ('ent-unverified-1', 'ent-unverified-2')");

    // 7. Integrity Verification: Unpaid donation pledges (PENDING_GATEWAY) are excluded from collected donations
    await db.query(
      "INSERT INTO DonationPledge (id, entityType, entityId, amount, tier, cause, donorName, donorEmail, status) VALUES ('plg-test-pending', 'CLUB', 'club-1', 500.00, 'Gold', 'Trial Grounds', 'Donor One', 'donor1@example.com', 'PENDING_GATEWAY')"
    );
    const postPledgeReport = await request('GET', '/api/v1/reports/financial-overview?period=all', null, superAdminToken);
    assert(postPledgeReport.body?.data?.summary?.donationsRevenue === 0.00, 'Unpaid donation pledges (PENDING_GATEWAY) are strictly excluded from collected donations');
    await db.query("DELETE FROM DonationPledge WHERE id = 'plg-test-pending'");

    // 8. Integrity Verification: Simulated payment sandbox charges in FinancialTransaction are excluded from collected fundraising
    await db.query(
      "INSERT INTO FinancialTransaction (id, type, category, amount, description) VALUES ('txn-sim-test-1', 'PAYMENT_IN', 'Fundraising', 1000.00, '[SIMULATED] Payment for Test Member | Ref: TXN-SIM-9999')"
    );
    const postSimReport = await request('GET', '/api/v1/reports/financial-overview?period=all', null, superAdminToken);
    assert(postSimReport.body?.data?.summary?.fundraisingRevenue === 0.00, 'Simulated payment sandbox charges in FinancialTransaction are strictly excluded from collected fundraising');
    await db.query("DELETE FROM FinancialTransaction WHERE id = 'txn-sim-test-1'");

    // 9. Integrity Verification: Past year records are strictly excluded from YTD boundaries in /api/v1/national
    await db.query(
      "INSERT INTO `Order` (id, orderNumber, customerName, total, status, fulfillmentStatus, payoutStatus, clubId, createdAt) VALUES ('ord-historical-2024', 'ORD-2024', 'Old Customer', 500.00, 'Delivered', 'Delivered', 'Completed', 'club-1', '2024-05-01 10:00:00')"
    );
    const ytdBoundaryOverview = await request('GET', '/api/v1/national');
    assert(ytdBoundaryOverview.body?.data?.nationalRevenueYTD === 385.49, 'Past year historical records (2024) are strictly excluded from nationalRevenueYTD by YTD boundary');
    await db.query("DELETE FROM `Order` WHERE id = 'ord-historical-2024'");

    // Simulated DB error does not produce fake success on reports
    const origQuery = db.query;
    db.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('SELECT COALESCE(SUM(total)')) {
        throw new Error('Simulated database failure in financial aggregation');
      }
      return origQuery.call(db, sql, params);
    };

    const failedReport = await request('GET', '/api/v1/reports/financial-overview', null, superAdminToken);
    assert(failedReport.status === 500, 'Database failure in report returns HTTP 500 DB_ERROR');
    assert(failedReport.body?.success === false, 'Report error response indicates success: false');
    assert(failedReport.body?.error?.code === 'DB_ERROR', 'Error code is DB_ERROR');

    db.query = origQuery;

    // -----------------------------------------------------------------
    // SECTION 7: Role Changes, Member PII Protection & Scope Query Isolation (Fix 2)
    // -----------------------------------------------------------------
    console.log('\n[7/9] Testing Role Changes, Member PII Protection & Scope Query Isolation...');

    // Negative test: Unauthenticated user roles directory rejected
    const unauthedUsersRoles = await request('GET', '/api/v1/users-roles');
    assert(unauthedUsersRoles.status === 401, 'Unauthenticated GET /api/v1/users-roles rejected with HTTP 401');

    // Negative test: Regular member accessing users roles directory rejected
    const memberUsersRoles = await request('GET', '/api/v1/users-roles', null, memberToken);
    assert(memberUsersRoles.status === 403, 'Member GET /api/v1/users-roles rejected with HTTP 403 Forbidden');

    // Positive test: Super Admin accessing users roles directory succeeds
    const adminUsersRoles = await request('GET', '/api/v1/users-roles', null, superAdminToken);
    assert(adminUsersRoles.status === 200, 'Super Admin GET /api/v1/users-roles succeeds with HTTP 200');

    // Negative test: Member attempting to change role rejected
    const memberRoleChange = await request('PUT', '/api/v1/users/usr-regular-member/role', { role: 'SUPER_ADMIN' }, memberToken);
    assert(memberRoleChange.status === 403, 'Member PUT /api/v1/users/:id/role rejected with HTTP 403 Forbidden');

    // Member PII Protection: Unauthenticated request to member directory rejected
    const unauthedMembersGet = await request('GET', '/api/v1/members');
    assert(unauthedMembersGet.status === 401, 'Unauthenticated GET /api/v1/members rejected with HTTP 401 (PII protected)');

    // Member PII Protection: Forged/invalid token rejected
    const bogusMembersGet = await request('GET', '/api/v1/members', null, bogusSecretToken);
    assert(bogusMembersGet.status === 401, 'Invalid token GET /api/v1/members rejected with HTTP 401');

    // Member PII Protection: Ordinary member rejected from accessing directory
    const memberDirectoryGet = await request('GET', '/api/v1/members', null, memberToken);
    assert(memberDirectoryGet.status === 403, 'Ordinary Member GET /api/v1/members rejected with HTTP 403 Forbidden');

    // Positive test: Super Admin querying member directory succeeds
    const superAdminMembersGet = await request('GET', '/api/v1/members', null, superAdminToken);
    assert(superAdminMembersGet.status === 200, 'Super Admin GET /api/v1/members succeeds with HTTP 200');
    assert(Array.isArray(superAdminMembersGet.body?.data), 'Super Admin receives member directory array');

    // Scope query isolation test: State Admin (Texas) querying members sees ONLY Texas records
    const stateAdminMembers = await request('GET', '/api/v1/members', null, stateAdminToken);
    assert(stateAdminMembers.status === 200, 'State Admin GET /api/v1/members succeeds with HTTP 200');
    const stateMembers = stateAdminMembers.body?.data || [];
    const allTexas = stateMembers.length > 0 && stateMembers.every(m => m.state === 'Texas' || m.state === 'TX');
    assert(allTexas, 'State Admin query is strictly scoped to Texas (Tennessee & Kentucky excluded)');

    // Scope query isolation test: Club Admin (club-1) querying members sees ONLY club-1 records
    const clubAdminMembers = await request('GET', '/api/v1/members', null, clubAdminToken);
    assert(clubAdminMembers.status === 200, 'Club Admin GET /api/v1/members succeeds with HTTP 200');
    const clubMembers = clubAdminMembers.body?.data || [];
    const allClub1 = clubMembers.length > 0 && clubMembers.every(m => m.club.toLowerCase().includes('oak ridge'));
    assert(allClub1, 'Club Admin query is strictly scoped to Oak Ridge Hunting Club');


    // -----------------------------------------------------------------
    // SECTION 8: Structured HTTP 404 for Undefined Routes
    // -----------------------------------------------------------------
    console.log('\n[8/9] Testing Structured HTTP 404 for Undefined API Paths...');

    const unknownRouteGet = await request('GET', '/api/v1/nonexistent-service-endpoint');
    assert(unknownRouteGet.status === 404, 'GET /api/v1/nonexistent returns HTTP 404');
    assert(unknownRouteGet.body?.error?.code === 'ROUTE_NOT_FOUND', 'Error code is ROUTE_NOT_FOUND');

    const unknownRoutePost = await request('POST', '/api/v1/unknown-module-bypass', { payload: 'exploit' });
    assert(unknownRoutePost.status === 404, 'POST /api/v1/unknown returns HTTP 404');

    // -----------------------------------------------------------------
    // SECTION 9: Honest Payment Gateway Status & Transparency
    // -----------------------------------------------------------------
    console.log('\n[9/9] Testing Honest Payment Gateway Status & Transparency...');

    const paymentConfigRes = await request('GET', '/api/v1/payments/config');
    assert(paymentConfigRes.status === 200, 'GET /api/v1/payments/config returns HTTP 200');
    assert(paymentConfigRes.body?.isConfigured === false, 'Payment gateway configuration honestly reports isConfigured = false');
    assert(paymentConfigRes.body?.status === 'SANDBOX_PENDING_GATEWAY', 'Status is explicitly SANDBOX_PENDING_GATEWAY');

    const chargeRes = await request('POST', '/api/v1/payments/charge', {
      amount: 45.00,
      customerName: 'Test Hunter',
      email: 'hunter@example.com'
    });
    assert(chargeRes.status === 200, 'POST /api/v1/payments/charge returns HTTP 200');
    assert(chargeRes.body?.status === 'SIMULATED_TEST', 'Transaction status clearly marked as SIMULATED_TEST');
    assert(chargeRes.body?.isLiveCharge === false, 'isLiveCharge is explicitly false (no real Clover charge)');

    // -----------------------------------------------------------------
    // SECTION 10: Event Check-In Persistence & Scoped Attendance
    // -----------------------------------------------------------------
    console.log('\n[10/12] Testing Event Check-In Persistence & Scoped Attendance...');

    // 1. Unauthenticated check-in rejected
    const unauthedCheckIn = await request('PUT', '/api/v1/events/entries/ent-1/check-in', { checkInStatus: 'Checked In' });
    assert(unauthedCheckIn.status === 401, 'Unauthenticated PUT check-in rejected with HTTP 401');

    // 2. Member check-in rejected
    const memberCheckIn = await request('PUT', '/api/v1/events/entries/ent-1/check-in', { checkInStatus: 'Checked In' }, memberToken);
    assert(memberCheckIn.status === 403, 'Ordinary Member PUT check-in rejected with HTTP 403 Forbidden');

    // 3. Out-of-scope Club Admin (club-1) checking in entry for club-2 event (ent-2)
    const outOfScopeCheckIn = await request('PUT', '/api/v1/events/entries/ent-2/check-in', { checkInStatus: 'Checked In' }, clubAdminToken);
    assert(outOfScopeCheckIn.status === 403, 'Out-of-scope Club Admin check-in rejected with HTTP 403 Forbidden');

    // 4. Nonexistent entry returns 404
    const notFoundCheckIn = await request('PUT', '/api/v1/events/entries/nonexistent-ent/check-in', { checkInStatus: 'Checked In' }, superAdminToken);
    assert(notFoundCheckIn.status === 404, 'Nonexistent entry ID returns HTTP 404 Not Found');

    // 5. Invalid check-in status returns 400
    const invalidStatusCheckIn = await request('PUT', '/api/v1/events/entries/ent-1/check-in', { checkInStatus: 'InvalidStatus' }, clubAdminToken);
    assert(invalidStatusCheckIn.status === 400, 'Invalid check-in status returns HTTP 400 Bad Request');

    // 6. Authorized Club Admin checking in entry in own club (ent-1 in evt-1)
    const validCheckIn = await request('PUT', '/api/v1/events/entries/ent-1/check-in', { checkInStatus: 'Checked In' }, clubAdminToken);
    assert(validCheckIn.status === 200, 'Authorized Club Admin check-in succeeds with HTTP 200 OK');
    assert(validCheckIn.body?.data?.checkInStatus === 'Checked In', 'Check-in status returned as Checked In');
    assert(Boolean(validCheckIn.body?.data?.checkedInAt), 'Check-in timestamp recorded on entry');

    // 7. Verify persistence via subsequent GET /api/v1/events/entries
    const verifiedEntries = await request('GET', '/api/v1/events/entries?eventId=evt-1');
    assert(verifiedEntries.status === 200, 'GET /api/v1/events/entries returns HTTP 200');
    const checkedEntry = verifiedEntries.body?.data?.find(e => e.id === 'ent-1');
    assert(checkedEntry?.checkInStatus === 'Checked In', 'Subsequent GET verifies persisted check-in status');
    assert(Boolean(checkedEntry?.checkedInAt), 'Subsequent GET verifies persisted check-in timestamp');

    // -----------------------------------------------------------------
    // SECTION 11: Event-Entry Payment Status Persistence
    // -----------------------------------------------------------------
    console.log('\n[11/12] Testing Event-Entry Payment Status Persistence...');

    // 1. Unauthenticated payment update rejected
    const unauthedPayment = await request('PUT', '/api/v1/events/entries/ent-1/payment', { paymentStatus: 'Paid' });
    assert(unauthedPayment.status === 401, 'Unauthenticated PUT payment rejected with HTTP 401');

    // 2. Ordinary member marking entry as Paid rejected
    const memberPayment = await request('PUT', '/api/v1/events/entries/ent-1/payment', { paymentStatus: 'Paid' }, memberToken);
    assert(memberPayment.status === 403, 'Member cannot self-mark payment as Paid (HTTP 403 Forbidden)');

    // 3. Out-of-scope admin rejected
    const outOfScopePayment = await request('PUT', '/api/v1/events/entries/ent-2/payment', { paymentStatus: 'Paid' }, clubAdminToken);
    assert(outOfScopePayment.status === 403, 'Out-of-scope Club Admin payment update rejected with HTTP 403 Forbidden');

    // 4. Missing entry returns 404
    const notFoundPayment = await request('PUT', '/api/v1/events/entries/missing-ent/payment', { paymentStatus: 'Paid' }, superAdminToken);
    assert(notFoundPayment.status === 404, 'Nonexistent entry ID for payment returns HTTP 404 Not Found');

    // 5. Invalid payment status returns 400
    const invalidStatusPayment = await request('PUT', '/api/v1/events/entries/ent-1/payment', { paymentStatus: 'FakeStatus' }, clubAdminToken);
    assert(invalidStatusPayment.status === 400, 'Invalid payment status returns HTTP 400 Bad Request');

    // 6. Authorized administrator attempting to mark unverified entry Paid is REJECTED
    const unverifiedPaidAttempt = await request('PUT', '/api/v1/events/entries/ent-1/payment', { paymentStatus: 'Paid' }, clubAdminToken);
    assert(unverifiedPaidAttempt.status === 400, 'Authorized admin cannot mark unverified entry as Paid (HTTP 400)');
    assert(unverifiedPaidAttempt.body?.error?.code === 'PAYMENT_VERIFICATION_REQUIRED', 'Error code is PAYMENT_VERIFICATION_REQUIRED');

    // 7. Authorized Club Admin updates payment to a permitted administrative status ('Comped')
    const validPermittedPayment = await request('PUT', '/api/v1/events/entries/ent-1/payment', { paymentStatus: 'Comped' }, clubAdminToken);
    assert(validPermittedPayment.status === 200, 'Authorized Club Admin updating to permitted status (Comped) succeeds with HTTP 200 OK');
    assert(validPermittedPayment.body?.data?.paymentStatus === 'Comped', 'Payment status updated to Comped in database response');

    // 8. Verify persistence via subsequent GET
    const reVerifiedEntries = await request('GET', '/api/v1/events/entries?eventId=evt-1');
    const updatedPaymentEntry = reVerifiedEntries.body?.data?.find(e => e.id === 'ent-1');
    assert(updatedPaymentEntry?.paymentStatus === 'Comped', 'Subsequent GET verifies persisted permitted payment status as Comped');

    // -----------------------------------------------------------------
    // SECTION 12: Competition Results Persistence & Scoped Submission
    // -----------------------------------------------------------------
    console.log('\n[12/12] Testing Competition Results Persistence & Scoped Submission...');

    // 1. Public GET /api/v1/results
    const publicResults = await request('GET', '/api/v1/results');
    assert(publicResults.status === 200, 'Public GET /api/v1/results returns HTTP 200');
    assert(Array.isArray(publicResults.body?.data), 'Results response data is an array');
    assert(publicResults.body?.data?.length >= 2, 'Results include seeded competition fixtures');

    // 2. Unauthenticated POST /api/v1/results rejected
    const unauthedResult = await request('POST', '/api/v1/results', {
      eventId: 'evt-1',
      eventName: 'Oak Ridge Championship Hunt',
      place: 2,
      participant: 'Marcus Vance',
      dog: 'Copper (Walker)',
      score: '320 Pts'
    });
    assert(unauthedResult.status === 401, 'Unauthenticated POST /api/v1/results rejected with HTTP 401');

    // 3. Ordinary Member POST /api/v1/results rejected
    const memberResult = await request('POST', '/api/v1/results', {
      eventId: 'evt-1',
      eventName: 'Oak Ridge Championship Hunt',
      place: 2,
      participant: 'Marcus Vance',
      dog: 'Copper (Walker)',
      score: '320 Pts'
    }, memberToken);
    assert(memberResult.status === 403, 'Ordinary Member POST /api/v1/results rejected with HTTP 403 Forbidden');

    // 4. Missing required fields returns 400
    const missingFieldResult = await request('POST', '/api/v1/results', {
      eventId: 'evt-1'
      // missing participant and dog
    }, clubAdminToken);
    assert(missingFieldResult.status === 400, 'POST /api/v1/results missing participant/dog returns HTTP 400');

    // 5. Nonexistent eventId returns 404
    const notFoundEventResult = await request('POST', '/api/v1/results', {
      eventId: 'nonexistent-evt',
      eventName: 'Ghost Event',
      place: 2,
      participant: 'Ghost Hunter',
      dog: 'Ghost Dog',
      score: '100 Pts'
    }, superAdminToken);
    assert(notFoundEventResult.status === 404, 'POST /api/v1/results with nonexistent eventId returns HTTP 404');

    // 6. Out-of-scope Club Admin rejected (Club Admin for club-1 submitting for evt-2 / club-2)
    const outOfScopeResult = await request('POST', '/api/v1/results', {
      eventId: 'evt-2',
      eventName: 'Cumberland Mountain Field Trial',
      place: 2,
      participant: 'Marcus Vance',
      dog: 'Copper (Walker)',
      score: '320 Pts'
    }, clubAdminToken);
    assert(outOfScopeResult.status === 403, 'Out-of-scope Club Admin publishing result rejected with HTTP 403 Forbidden');

    // 7. Authorized Club Admin publishes result for their event (evt-1 / club-1)
    const newResultPayload = {
      id: 'res-test-new-1',
      eventId: 'evt-1',
      eventName: 'Oak Ridge Championship Hunt',
      place: 2,
      placement: '2nd Place',
      participant: 'Marcus Vance',
      owner: 'Marcus Vance',
      winnerDog: 'Copper Ridge Walker',
      winnerDogReg: 'UKC-990011',
      breed: 'Treeing Walker Coonhound',
      score: '345 Pts',
      status: 'Published'
    };
    const validCreateResult = await request('POST', '/api/v1/results', newResultPayload, clubAdminToken);
    assert(validCreateResult.status === 201, 'Authorized Club Admin publishing result succeeds with HTTP 201 Created');
    assert(validCreateResult.body?.data?.placement === '2nd Place', 'Created result has placement "2nd Place"');
    assert(validCreateResult.body?.data?.club === 'Oak Ridge Hunting Club', 'Created result inherits club from event');

    // 8. Duplicate check: submitting identical result for same event, place, and dog rejected with 409
    const duplicateResult = await request('POST', '/api/v1/results', newResultPayload, clubAdminToken);
    assert(duplicateResult.status === 409, 'Duplicate competition result for same event/place/dog rejected with HTTP 409');

    // 9. Subsequent GET /api/v1/results returns newly created result
    const reFetchedResults = await request('GET', '/api/v1/results');
    assert(reFetchedResults.status === 200, 'GET /api/v1/results returns HTTP 200');
    const createdResultInList = reFetchedResults.body?.data?.find(r => r.id === 'res-test-new-1');
    assert(Boolean(createdResultInList), 'Subsequent GET verifies persisted competition result');
    // -----------------------------------------------------------------
    // SECTION 13: Order Fulfillment, Payout Persistence & Scoped Retrieval
    // -----------------------------------------------------------------
    console.log('\n[13/13] Testing Order Fulfillment, Payout Persistence & Scoped Retrieval...');

    // 1. Unauthenticated GET /api/v1/orders rejected
    const unauthedOrdersGet = await request('GET', '/api/v1/orders');
    assert(unauthedOrdersGet.status === 401, 'Unauthenticated GET /api/v1/orders rejected with HTTP 401');

    // 2. Member GET /api/v1/orders is scoped to member email
    const memberOrdersGet = await request('GET', '/api/v1/orders', null, memberToken);
    assert(memberOrdersGet.status === 200, 'Member GET /api/v1/orders returns HTTP 200');
    assert(Array.isArray(memberOrdersGet.body?.data), 'Member orders response is an array');
    const memberOrderIds = (memberOrdersGet.body?.data || []).map(o => o.id);
    assert(memberOrderIds.includes('ord-1'), 'Member can retrieve their own order ord-1');
    assert(!memberOrderIds.includes('ord-2'), 'Member cannot retrieve another customer order ord-2 (scoped isolation)');

    // 3. Club Admin (club-1) GET /api/v1/orders is scoped to club-1
    const clubAdminOrdersGet = await request('GET', '/api/v1/orders', null, clubAdminToken);
    assert(clubAdminOrdersGet.status === 200, 'Club Admin GET /api/v1/orders returns HTTP 200');
    const clubAdminOrderIds = (clubAdminOrdersGet.body?.data || []).map(o => o.id);
    assert(clubAdminOrderIds.includes('ord-1'), 'Club Admin can retrieve orders belonging to their club (ord-1)');
    assert(!clubAdminOrderIds.includes('ord-2'), 'Club Admin cannot retrieve orders belonging to another club (ord-2)');

    // 4. Super Admin GET /api/v1/orders retrieves all orders across all clubs
    const superAdminOrdersGet = await request('GET', '/api/v1/orders', null, superAdminToken);
    assert(superAdminOrdersGet.status === 200, 'Super Admin GET /api/v1/orders returns HTTP 200');
    const superAdminOrderIds = (superAdminOrdersGet.body?.data || []).map(o => o.id);
    assert(superAdminOrderIds.includes('ord-1') && superAdminOrderIds.includes('ord-2'), 'Super Admin retrieves all orders across all clubs');

    // 5. Unauthenticated PUT fulfillment rejected
    const unauthedFulfillment = await request('PUT', '/api/v1/orders/ord-1/fulfillment', { fulfillmentStatus: 'Shipped' });
    assert(unauthedFulfillment.status === 401, 'Unauthenticated PUT fulfillment rejected with HTTP 401');

    // 6. Ordinary Member PUT fulfillment rejected
    const memberFulfillment = await request('PUT', '/api/v1/orders/ord-1/fulfillment', { fulfillmentStatus: 'Shipped' }, memberToken);
    assert(memberFulfillment.status === 403, 'Ordinary Member PUT fulfillment rejected with HTTP 403 Forbidden');

    // 7. Out-of-scope Club Admin updating fulfillment on another club order (ord-2 in club-2) rejected
    const outOfScopeFulfillment = await request('PUT', '/api/v1/orders/ord-2/fulfillment', { fulfillmentStatus: 'Shipped' }, clubAdminToken);
    assert(outOfScopeFulfillment.status === 403, 'Out-of-scope Club Admin PUT fulfillment rejected with HTTP 403 Forbidden');

    // 8. Updating nonexistent order returns 404
    const notFoundFulfillment = await request('PUT', '/api/v1/orders/nonexistent-ord/fulfillment', { fulfillmentStatus: 'Shipped' }, superAdminToken);
    assert(notFoundFulfillment.status === 404, 'PUT fulfillment on nonexistent order returns HTTP 404 Not Found');

    // 9. Invalid fulfillment status rejected with 400
    const invalidStatusFulfillment = await request('PUT', '/api/v1/orders/ord-1/fulfillment', { fulfillmentStatus: 'TELEPORTED' }, clubAdminToken);
    assert(invalidStatusFulfillment.status === 400, 'Invalid fulfillment status rejected with HTTP 400 Bad Request');
    assert(invalidStatusFulfillment.body?.error?.code === 'INVALID_FULFILLMENT_STATUS', 'Error code is INVALID_FULFILLMENT_STATUS');

    // 10. Authorized Club Admin updates fulfillment on own club order (ord-1)
    const validFulfillment = await request('PUT', '/api/v1/orders/ord-1/fulfillment', {
      fulfillmentStatus: 'Shipped',
      trackingNumber: 'TRACK-998877-USPS',
      carrier: 'USPS'
    }, clubAdminToken);
    assert(validFulfillment.status === 200, 'Authorized Club Admin updating fulfillment succeeds with HTTP 200 OK');
    assert(validFulfillment.body?.data?.fulfillmentStatus === 'Shipped', 'Fulfillment status returned as Shipped');
    assert(validFulfillment.body?.data?.trackingNumber === 'TRACK-998877-USPS', 'Tracking number returned');
    assert(validFulfillment.body?.data?.carrier === 'USPS', 'Carrier returned');

    // 11. Persistence verification: Direct DB query and subsequent GET /api/v1/orders/:id
    const [persistedOrderRows] = await db.query('SELECT * FROM `Order` WHERE id = ?', ['ord-1']);
    assert(persistedOrderRows.length === 1, 'Order record persists in database');
    assert(persistedOrderRows[0].fulfillmentStatus === 'Shipped', 'Database confirms fulfillmentStatus is Shipped');
    assert(persistedOrderRows[0].trackingNumber === 'TRACK-998877-USPS', 'Database confirms trackingNumber is persisted');
    assert(persistedOrderRows[0].carrier === 'USPS', 'Database confirms carrier is persisted');

    const subsequentGetOrder = await request('GET', '/api/v1/orders/ord-1', null, clubAdminToken);
    assert(subsequentGetOrder.status === 200, 'Subsequent GET /api/v1/orders/:id returns HTTP 200');
    assert(subsequentGetOrder.body?.data?.fulfillmentStatus === 'Shipped', 'Subsequent GET verifies persisted fulfillmentStatus');
    assert(subsequentGetOrder.body?.data?.trackingNumber === 'TRACK-998877-USPS', 'Subsequent GET verifies persisted trackingNumber');

    // 12. Unauthenticated PUT payout rejected
    const unauthedPayout = await request('PUT', '/api/v1/orders/ord-1/payout', { payoutStatus: 'Paid' });
    assert(unauthedPayout.status === 401, 'Unauthenticated PUT payout rejected with HTTP 401');

    // 13. Ordinary Member PUT payout rejected
    const memberPayout = await request('PUT', '/api/v1/orders/ord-1/payout', { payoutStatus: 'Paid' }, memberToken);
    assert(memberPayout.status === 403, 'Ordinary Member PUT payout rejected with HTTP 403 Forbidden');

    // 14. Out-of-scope Club Admin updating payout on another club order rejected
    const outOfScopePayout = await request('PUT', '/api/v1/orders/ord-2/payout', { payoutStatus: 'Approved' }, clubAdminToken);
    assert(outOfScopePayout.status === 403, 'Out-of-scope Club Admin updating payout rejected with HTTP 403 Forbidden');

    // 15. Invalid payout status rejected with 400
    const invalidStatusPayout = await request('PUT', '/api/v1/orders/ord-1/payout', { payoutStatus: 'FREE_MONEY_TRANSFER' }, superAdminToken);
    assert(invalidStatusPayout.status === 400, 'Invalid payout status rejected with HTTP 400 Bad Request');
    assert(invalidStatusPayout.body?.error?.code === 'INVALID_PAYOUT_STATUS', 'Error code is INVALID_PAYOUT_STATUS');

    // 16. Nonexistent order PUT payout returns 404
    const notFoundPayout = await request('PUT', '/api/v1/orders/nonexistent-ord/payout', { payoutStatus: 'Approved' }, superAdminToken);
    assert(notFoundPayout.status === 404, 'PUT payout on nonexistent order returns HTTP 404 Not Found');

    // 17. Authorized Super Admin updates payout status to Approved
    const validPayout = await request('PUT', '/api/v1/orders/ord-1/payout', {
      payoutStatus: 'Approved'
    }, superAdminToken);
    assert(validPayout.status === 200, 'Authorized Super Admin updating payout succeeds with HTTP 200 OK');
    assert(validPayout.body?.data?.payoutStatus === 'Approved', 'Payout status updated to Approved in response');
    assert(validPayout.body?.meta?.bankTransferExecuted === false, 'Meta honestly reports bankTransferExecuted is false');

    // 18. Persistence verification for payout status
    const [persistedPayoutRows] = await db.query('SELECT payoutStatus FROM `Order` WHERE id = ?', ['ord-1']);
    assert(persistedPayoutRows[0]?.payoutStatus === 'Approved', 'Database confirms payoutStatus is Approved');

    const subsequentGetPayout = await request('GET', '/api/v1/orders/ord-1', null, superAdminToken);
    assert(subsequentGetPayout.body?.data?.payoutStatus === 'Approved', 'Subsequent GET verifies persisted payoutStatus');

    // 19. Database failure on fulfillment update does not produce a fake success response
    const originalQuery = db.query;
    db.query = async (sql, params) => {
      if (typeof sql === 'string' && (sql.includes('UPDATE `Order`') || sql.includes('UPDATE "Order"'))) {
        throw new Error('Simulated database write failure');
      }
      return originalQuery.call(db, sql, params);
    };

    const failedFulfillment = await request('PUT', '/api/v1/orders/ord-1/fulfillment', {
      fulfillmentStatus: 'Delivered'
    }, superAdminToken);
    assert(failedFulfillment.status === 500, 'Database failure does not produce a fake success response (HTTP 500)');
    assert(failedFulfillment.body?.success === false, 'Fulfillment response explicitly indicates success: false on DB error');
    assert(failedFulfillment.body?.error?.code === 'DB_ERROR', 'Fulfillment error code is DB_ERROR');

    // Restore query method and verify DB was NOT altered during failed operation
    db.query = originalQuery;
    const [unalteredFulfillment] = await db.query('SELECT fulfillmentStatus FROM `Order` WHERE id = ?', ['ord-1']);
    assert(unalteredFulfillment[0]?.fulfillmentStatus === 'Shipped', 'Database was not falsely updated during failed operation');

    // 20. Database failure on payout update does not produce a fake success response
    db.query = async (sql, params) => {
      if (typeof sql === 'string' && (sql.includes('UPDATE `Order`') || sql.includes('UPDATE "Order"'))) {
        throw new Error('Simulated payout transaction error');
      }
      return originalQuery.call(db, sql, params);
    };

    const failedPayout = await request('PUT', '/api/v1/orders/ord-1/payout', {
      payoutStatus: 'Completed'
    }, superAdminToken);
    assert(failedPayout.status === 500, 'Database failure on payout does not produce fake success response (HTTP 500)');
    assert(failedPayout.body?.success === false, 'Payout response explicitly indicates success: false on DB error');
    assert(failedPayout.body?.error?.code === 'DB_ERROR', 'Payout error code is DB_ERROR');

    db.query = originalQuery;

    // -----------------------------------------------------------------
    // SECTION 10: Phase 9 — Clover Gateway Integration, Webhooks & Settlement Integrity
    // -----------------------------------------------------------------
    console.log('\n[10/10] Testing Clover Gateway Integration, Webhooks & Settlement Integrity...');

    // 1. Clover payment gateway configuration returns honest status and merchant ID
    const cloverConfigRes = await request('GET', '/api/v1/payments/config');
    assert(cloverConfigRes.status === 200, 'GET /api/v1/payments/config returns HTTP 200');
    assert(cloverConfigRes.body?.gateway === 'Clover', 'Gateway name is Clover');
    assert(cloverConfigRes.body?.merchantId === '526695041883', 'Clover merchant ID matches expected 526695041883');
    assert(cloverConfigRes.body?.currency === 'USD', 'Currency is USD');
    assert(cloverConfigRes.body?.isConfigured === false, 'isConfigured is false in unconfigured/test environment');
    assert(cloverConfigRes.body?.status === 'SANDBOX_PENDING_GATEWAY', 'Status is SANDBOX_PENDING_GATEWAY');
    assert(Array.isArray(cloverConfigRes.body?.missingPrerequisites), 'missingPrerequisites is returned as an array');
    assert(cloverConfigRes.body?.missingPrerequisites.includes('CLOVER_API_KEY'), 'missingPrerequisites lists CLOVER_API_KEY');

    // 2. Charge with invalid amount (<= 0) is rejected
    const invalidAmountRes = await request('POST', '/api/v1/payments/charge', { amount: 0 });
    assert(invalidAmountRes.status === 400, 'Charge with 0 amount returns HTTP 400');
    assert(invalidAmountRes.body?.error?.code === 'INVALID_AMOUNT', 'Error code is INVALID_AMOUNT');

    const negativeAmountRes = await request('POST', '/api/v1/payments/charge', { amount: -25.00 });
    assert(negativeAmountRes.status === 400, 'Charge with negative amount returns HTTP 400');

    // 3. Simulated test charge in sandbox/unconfigured mode
    const simChargeRes = await request('POST', '/api/v1/payments/charge', {
      amount: 45.00,
      customerName: 'Jane Hunter',
      email: 'jane@example.com',
      category: 'EVENT_ENTRY',
      cardLast4: '5555'
    });
    assert(simChargeRes.status === 200, 'Simulated test charge returns HTTP 200');
    assert(simChargeRes.body?.status === 'SIMULATED_TEST', 'Simulated charge explicitly has status SIMULATED_TEST');
    assert(simChargeRes.body?.isLiveCharge === false, 'isLiveCharge is strictly false');
    assert(simChargeRes.body?.verified === false, 'verified is strictly false');
    assert(simChargeRes.body?.amount === 45.00, 'Charge amount is 45.00');

    const simTxnId = simChargeRes.body?.transactionId;
    assert(simTxnId && simTxnId.startsWith('TXN-SIM-'), 'Transaction ID has TXN-SIM- prefix');

    // Verify simulated transaction in DB ledger has [SIMULATED] tag
    const [simTxnDb] = await db.query('SELECT * FROM `FinancialTransaction` WHERE id = ?', [simTxnId]);
    assert(simTxnDb.length === 1, 'Simulated transaction recorded in FinancialTransaction table');
    assert(simTxnDb[0].description.includes('[SIMULATED]'), 'Simulated transaction description contains [SIMULATED]');

    // 4. Verification endpoint authentication & authorization protections
    const verifyUnauthRes = await request('GET', `/api/v1/payments/verify/${simTxnId}`);
    assert(verifyUnauthRes.status === 401, 'Unauthenticated GET /api/v1/payments/verify/:id returns HTTP 401 UNAUTHORIZED');
    assert(verifyUnauthRes.body?.error?.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

    const verifyMemberForbiddenRes = await request('GET', `/api/v1/payments/verify/${simTxnId}`, null, memberToken);
    assert(verifyMemberForbiddenRes.status === 403, 'Member accessing unrelated transaction returns HTTP 403 FORBIDDEN');
    assert(verifyMemberForbiddenRes.body?.error?.code === 'FORBIDDEN', 'Error code is FORBIDDEN');

    const verifyAdminRes = await request('GET', `/api/v1/payments/verify/${simTxnId}`, null, superAdminToken);
    assert(verifyAdminRes.status === 200, 'Super Admin GET /api/v1/payments/verify/:id returns HTTP 200');
    assert(verifyAdminRes.body?.verified === false, 'verify endpoint reports verified: false for simulated charge');
    assert(verifyAdminRes.body?.isSimulated === true, 'verify endpoint reports isSimulated: true');
    assert(verifyAdminRes.body?.status === 'SIMULATED_TEST', 'Status is SIMULATED_TEST');

    // 5. Transaction ledger authentication protection
    const ledgerUnauthRes = await request('GET', '/api/v1/payments/transactions');
    assert(ledgerUnauthRes.status === 401, 'Unauthenticated GET /api/v1/payments/transactions returns HTTP 401 UNAUTHORIZED');

    const ledgerAdminRes = await request('GET', '/api/v1/payments/transactions', null, superAdminToken);
    assert(ledgerAdminRes.status === 200, 'Authenticated Super Admin GET /api/v1/payments/transactions returns HTTP 200');
    assert(Array.isArray(ledgerAdminRes.body?.data), 'Transaction ledger returns an array');

    // 6. Currency Mismatch protection
    const currencyMismatchRes = await request('POST', '/api/v1/payments/charge', {
      amount: 45.00,
      currency: 'EUR'
    });
    assert(currencyMismatchRes.status === 400, 'Payment with non-USD currency returns HTTP 400');
    assert(currencyMismatchRes.body?.error?.code === 'INVALID_CURRENCY', 'Error code is INVALID_CURRENCY');

    // 7. Upfront Entity Existence and Amount Mismatch Protection on Charge
    await db.query(
      "INSERT INTO EventEntry (id, eventId, participant, fee, paymentStatus, confirmationCode) VALUES ('ee-phase9-test-1', 'ev-1', 'Verified Competitor', 45.00, 'Pending Payment', 'UHC-P9-CONF-1')"
    );

    const nonexistentEntityRes = await request('POST', '/api/v1/payments/charge', {
      amount: 45.00,
      entryId: 'ee-does-not-exist-999'
    });
    assert(nonexistentEntityRes.status === 404, 'Charge with nonexistent entryId returns HTTP 404 ENTRY_NOT_FOUND');
    assert(nonexistentEntityRes.body?.error?.code === 'ENTRY_NOT_FOUND', 'Error code is ENTRY_NOT_FOUND');

    const chargeAmountMismatchRes = await request('POST', '/api/v1/payments/charge', {
      amount: 1.00,
      entryId: 'ee-phase9-test-1'
    });
    assert(chargeAmountMismatchRes.status === 400, 'Underpayment charge amount mismatch returns HTTP 400 AMOUNT_MISMATCH');
    assert(chargeAmountMismatchRes.body?.error?.code === 'AMOUNT_MISMATCH', 'Error code is AMOUNT_MISMATCH');

    // 8. Clover Webhook challenge handshake
    const challengeRes = await request('POST', '/api/v1/payments/webhook', {
      verificationCode: 'clover-verification-handshake-token-123'
    });
    assert(challengeRes.status === 200, 'Webhook challenge handshake returns HTTP 200');
    assert(challengeRes.body?.verificationCode === 'clover-verification-handshake-token-123', 'Webhook challenge echoes verificationCode');

    // 9. Webhook Signature Security: Unconfigured secret strictly blocks webhook
    delete process.env.CLOVER_WEBHOOK_SECRET;
    const testWebhookPayload = {
      eventId: 'evt-clv-test-901',
      paymentId: 'PMT_CLV_901',
      amount: 45.00,
      targetEntity: {
        type: 'EVENT_ENTRY',
        id: 'ee-phase9-test-1'
      }
    };
    const unconfiguredSecretRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      testWebhookPayload,
      null,
      { 'X-Clover-Signature': 'deadbeef0000111122223333444455556666777788889999aaaabbbbccccdddd' }
    );
    assert(unconfiguredSecretRes.status === 401, 'Webhook with unconfigured secret is strictly rejected (HTTP 401)');

    // 10. Webhook with invalid signature is rejected
    process.env.CLOVER_WEBHOOK_SECRET = 'whsec_test_secret_clover_phase9';
    const crypto = require('crypto');
    const invalidSigRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      testWebhookPayload,
      null,
      { 'X-Clover-Signature': 'deadbeef0000111122223333444455556666777788889999aaaabbbbccccdddd' }
    );
    assert(invalidSigRes.status === 401, 'Webhook with invalid signature returns HTTP 401');
    assert(invalidSigRes.body?.error?.code === 'INVALID_SIGNATURE', 'Error code is INVALID_SIGNATURE');

    // 11. Webhook with Amount Mismatch cannot mark entry as Paid
    const mismatchWebhookPayload = {
      eventId: 'evt-clv-mismatch-901',
      paymentId: 'PMT_CLV_MISMATCH_901',
      amount: 5.00, // Entry fee is $45.00, but webhook claims $5.00!
      targetEntity: {
        type: 'EVENT_ENTRY',
        id: 'ee-phase9-test-1'
      }
    };
    const mismatchHmac = crypto.createHmac('sha256', process.env.CLOVER_WEBHOOK_SECRET)
      .update(Buffer.from(JSON.stringify(mismatchWebhookPayload)))
      .digest('hex');

    const mismatchWebhookRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      mismatchWebhookPayload,
      null,
      { 'X-Clover-Signature': mismatchHmac }
    );
    assert(mismatchWebhookRes.status === 400, 'Webhook with amount mismatch is rejected (HTTP 400)');
    assert(mismatchWebhookRes.body?.error?.code === 'AMOUNT_MISMATCH', 'Error code is AMOUNT_MISMATCH');

    const [unsettledEntryRows] = await db.query("SELECT paymentStatus FROM `EventEntry` WHERE id = 'ee-phase9-test-1'");
    assert(unsettledEntryRows[0]?.paymentStatus === 'Pending Payment', 'Entry remains Pending Payment after mismatched webhook rejection');

    // 12. Non-Paid Webhook Status (DECLINED / PENDING) cannot mark entry as Paid
    const declinedWebhookPayload = {
      eventId: 'evt-clv-declined-901',
      paymentId: 'PMT_CLV_DECLINED_901',
      amount: 45.00,
      status: 'DECLINED',
      targetEntity: {
        type: 'EVENT_ENTRY',
        id: 'ee-phase9-test-1'
      }
    };
    const declinedHmac = crypto.createHmac('sha256', process.env.CLOVER_WEBHOOK_SECRET)
      .update(Buffer.from(JSON.stringify(declinedWebhookPayload)))
      .digest('hex');

    const declinedWebhookRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      declinedWebhookPayload,
      null,
      { 'X-Clover-Signature': declinedHmac }
    );
    assert(declinedWebhookRes.status === 200, 'Declined webhook is received cleanly (HTTP 200)');
    assert(declinedWebhookRes.body?.settlement === null, 'Declined webhook does not execute settlement');

    const [stillPendingEntryRows] = await db.query("SELECT paymentStatus FROM `EventEntry` WHERE id = 'ee-phase9-test-1'");
    assert(stillPendingEntryRows[0]?.paymentStatus === 'Pending Payment', 'Entry remains Pending Payment after declined webhook');

    // 13. Valid Verified Webhook updates EventEntry from 'Pending Payment' to 'Paid'
    const payloadStr = JSON.stringify(testWebhookPayload);
    const validHmac = crypto.createHmac('sha256', process.env.CLOVER_WEBHOOK_SECRET)
      .update(Buffer.from(payloadStr))
      .digest('hex');

    const validWebhookRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      testWebhookPayload,
      null,
      { 'X-Clover-Signature': validHmac }
    );
    assert(validWebhookRes.status === 200, 'Webhook with valid HMAC signature returns HTTP 200');
    assert(validWebhookRes.body?.success === true, 'Webhook response indicates success: true');
    assert(validWebhookRes.body?.processed === true, 'Webhook response indicates processed: true');

    const [updatedEntryRows] = await db.query("SELECT * FROM `EventEntry` WHERE id = 'ee-phase9-test-1'");
    assert(updatedEntryRows[0]?.paymentStatus === 'Paid', 'EventEntry paymentStatus was updated to Paid by verified gateway webhook');

    const [verifiedTxnRows] = await db.query(
      "SELECT * FROM `FinancialTransaction` WHERE description LIKE '%PMT_CLV_901%'"
    );
    assert(verifiedTxnRows.length === 1, 'Verified transaction logged in FinancialTransaction table');
    assert(verifiedTxnRows[0].description.includes('[VERIFIED_GATEWAY]'), 'Transaction description has [VERIFIED_GATEWAY] tag');

    // 14. Verification endpoint: verifyPaymentStatus for verified gateway transaction with Super Admin auth
    const verifyGatewayRes = await request('GET', `/api/v1/payments/verify/${verifiedTxnRows[0].id}`, null, superAdminToken);
    assert(verifyGatewayRes.status === 200, 'Super Admin GET /api/v1/payments/verify/:id returns HTTP 200 for verified gateway txn');
    assert(verifyGatewayRes.body?.verified === true, 'Verified transaction has verified: true');
    assert(verifyGatewayRes.body?.isSimulated === false, 'Verified transaction has isSimulated: false');
    assert(verifyGatewayRes.body?.status === 'PAID_VERIFIED', 'Verified transaction has status: PAID_VERIFIED');

    // 15. Webhook Idempotency: duplicate callback does not double-process or duplicate records
    const duplicateWebhookRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      testWebhookPayload,
      null,
      { 'X-Clover-Signature': validHmac }
    );
    assert(duplicateWebhookRes.status === 200, 'Duplicate webhook returns HTTP 200');
    assert(duplicateWebhookRes.body?.duplicate === true, 'Duplicate webhook response indicates duplicate: true');

    const [allTxnForEvent] = await db.query(
      "SELECT * FROM `FinancialTransaction` WHERE description LIKE '%PMT_CLV_901%'"
    );
    assert(allTxnForEvent.length === 1, 'Duplicate webhook did not create a second transaction record (idempotent)');

    // 16. Verified Webhook updates Member from 'Pending Payment Verification' to 'Active'
    await db.query(
      "INSERT INTO Member (id, name, email, phone, state, club, status, duesAmount, joinDate) VALUES ('mem-phase9-test-1', 'Verified New Member', 'verifiedmember@example.com', '555-0199', 'Tennessee', 'Oak Ridge Hunting Club', 'Pending Payment Verification', 35.00, 'Oct 27, 2026')"
    );

    const memberWebhookPayload = {
      eventId: 'evt-clv-member-902',
      paymentId: 'PMT_CLV_MEM_902',
      amount: 35.00,
      targetEntity: {
        type: 'MEMBER',
        id: 'mem-phase9-test-1'
      }
    };
    const memberPayloadStr = JSON.stringify(memberWebhookPayload);
    const memberHmac = crypto.createHmac('sha256', process.env.CLOVER_WEBHOOK_SECRET)
      .update(Buffer.from(memberPayloadStr))
      .digest('hex');

    const memberWebhookRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      memberWebhookPayload,
      null,
      { 'X-Clover-Signature': memberHmac }
    );
    assert(memberWebhookRes.status === 200, 'Member payment webhook returns HTTP 200');

    const [updatedMemberRows] = await db.query("SELECT status FROM `Member` WHERE id = 'mem-phase9-test-1'");
    assert(updatedMemberRows[0]?.status === 'Active', 'Member status updated from Pending Payment Verification to Active by verified webhook');

    // 17. Security Protection: Unverified administrative attempt to mark entry as Paid remains blocked
    const unverifiedPaidAttemptP9 = await request(
      'PUT',
      '/api/v1/events/entries/ee-phase9-test-1/payment',
      { paymentStatus: 'Paid' },
      superAdminToken
    );
    assert(unverifiedPaidAttemptP9.status === 400, 'Direct unverified attempt to mark entry Paid is rejected (HTTP 400)');
    assert(unverifiedPaidAttemptP9.body?.error?.code === 'PAYMENT_VERIFICATION_REQUIRED', 'Error code is PAYMENT_VERIFICATION_REQUIRED');

    // 18. Phase 9.3 Configuration Safety: Missing/Placeholder credentials fail safely
    const { makeCloverApiRequest, isCloverConfigured } = require('../controllers/paymentController');
    assert(isCloverConfigured() === false, 'isCloverConfigured correctly identifies placeholder/unconfigured keys');

    const origCloverEnv = process.env.CLOVER_ENVIRONMENT;
    process.env.CLOVER_ENVIRONMENT = 'sandbox';
    let missingCredError = null;
    try {
      await makeCloverApiRequest('/v1/charges', 'POST', { amount: 100 });
    } catch (e) {
      missingCredError = e;
    }
    assert(missingCredError !== null, 'makeCloverApiRequest rejects when credentials are placeholder/missing');
    assert(missingCredError.statusCode === 503, 'Rejection status is safe error code (503 CREDENTIALS_REQUIRED)');

    // 19. Phase 9.3 Environment Safety: Silent fallback to production is strictly blocked
    process.env.CLOVER_ENVIRONMENT = 'production';
    let prodSafetyBlockError = null;
    try {
      await makeCloverApiRequest('/v1/charges', 'POST', { amount: 100 });
    } catch (e) {
      prodSafetyBlockError = e;
    }
    assert(prodSafetyBlockError !== null, 'Production execution is blocked in non-production environments');
    assert(prodSafetyBlockError.statusCode === 403, 'Accidental production call blocked with HTTP 403 SAFETY_BLOCK');

    process.env.CLOVER_ENVIRONMENT = 'invalid_env_mode';
    let invalidEnvError = null;
    try {
      await makeCloverApiRequest('/v1/charges', 'POST', { amount: 100 });
    } catch (e) {
      invalidEnvError = e;
    }
    assert(invalidEnvError !== null, 'Ambiguous/invalid environment fails safely');
    assert(invalidEnvError.statusCode === 500, 'Invalid environment rejected with HTTP 500');
    process.env.CLOVER_ENVIRONMENT = origCloverEnv || 'sandbox';

    // 20. Phase 9.3 Non-Paid Status Tests: FAILED, PENDING, and REFUNDED do not trigger settlement
    process.env.CLOVER_WEBHOOK_SECRET = 'whsec_test_secret_clover_phase9';
    await db.query(
      "INSERT INTO EventEntry (id, eventId, participant, fee, paymentStatus, confirmationCode) VALUES ('ee-phase93-test-1', 'ev-1', 'NonPaid Competitor', 50.00, 'Pending Payment', 'UHC-P93-CONF-1')"
    );

    const nonPaidStatuses = ['FAILED', 'PENDING', 'REFUNDED'];
    for (const testStatus of nonPaidStatuses) {
      const nonPaidPayload = {
        eventId: `evt-clv-${testStatus.toLowerCase()}-903`,
        paymentId: `PMT_CLV_${testStatus}_903`,
        amount: 50.00,
        status: testStatus,
        targetEntity: {
          type: 'EVENT_ENTRY',
          id: 'ee-phase93-test-1'
        }
      };
      const nonPaidHmac = crypto.createHmac('sha256', process.env.CLOVER_WEBHOOK_SECRET)
        .update(Buffer.from(JSON.stringify(nonPaidPayload)))
        .digest('hex');

      const nonPaidRes = await request(
        'POST',
        '/api/v1/payments/webhook',
        nonPaidPayload,
        null,
        { 'X-Clover-Signature': nonPaidHmac }
      );
      assert(nonPaidRes.status === 200, `Webhook with ${testStatus} status is received cleanly (HTTP 200)`);
      assert(nonPaidRes.body?.settlement === null, `${testStatus} webhook does not execute settlement`);

      const [entryCheck] = await db.query("SELECT paymentStatus FROM `EventEntry` WHERE id = 'ee-phase93-test-1'");
      assert(entryCheck[0]?.paymentStatus === 'Pending Payment', `Entry remains Pending Payment after ${testStatus} webhook`);
    }

    // 21. Phase 9.3 Order Settlement: Verified webhook updates Order status to Processing
    await db.query(
      "INSERT INTO `Order` (id, orderNumber, customerName, total, status, fulfillmentStatus, payoutStatus, clubId) VALUES ('ord-phase93-test-1', 'ORD-P93-1', 'Verified Buyer', 89.99, 'Pending', 'Processing', 'Pending', 'club-1')"
    );

    const orderWebhookPayload = {
      eventId: 'evt-clv-order-904',
      paymentId: 'PMT_CLV_ORD_904',
      amount: 89.99,
      status: 'PAID',
      targetEntity: {
        type: 'ORDER',
        id: 'ord-phase93-test-1'
      }
    };
    const orderHmac = crypto.createHmac('sha256', process.env.CLOVER_WEBHOOK_SECRET)
      .update(Buffer.from(JSON.stringify(orderWebhookPayload)))
      .digest('hex');

    const orderWebhookRes = await request(
      'POST',
      '/api/v1/payments/webhook',
      orderWebhookPayload,
      null,
      { 'X-Clover-Signature': orderHmac }
    );
    assert(orderWebhookRes.status === 200, 'Order payment webhook returns HTTP 200');

    const [updatedOrderCheck] = await db.query("SELECT status FROM `Order` WHERE id = 'ord-phase93-test-1'");
    assert(updatedOrderCheck[0]?.status === 'Processing', 'Order status updated to Processing by verified payment webhook');

    // Clean up test records
    delete process.env.CLOVER_WEBHOOK_SECRET;
    await db.query("DELETE FROM EventEntry WHERE id = 'ee-phase9-test-1'");
    await db.query("DELETE FROM EventEntry WHERE id = 'ee-phase93-test-1'");
    await db.query("DELETE FROM Member WHERE id = 'mem-phase9-test-1'");
    await db.query("DELETE FROM `Order` WHERE id = 'ord-phase93-test-1'");
    await db.query("DELETE FROM FinancialTransaction WHERE id = ?", [simTxnId]);
    await db.query("DELETE FROM FinancialTransaction WHERE id = ?", [verifiedTxnRows[0].id]);
    await db.query("DELETE FROM FinancialTransaction WHERE description LIKE '%PMT_CLV_MEM_902%'");
    await db.query("DELETE FROM FinancialTransaction WHERE description LIKE '%PMT_CLV_ORD_904%'");

  } catch (err) {
    console.error('Fatal test execution error:', err);
  } finally {
    if (server) {
      server.close();
    }
    if (db && db.close) {
      await db.close();
    }
  }

  // Summary
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL ASSERTIONS EXECUTED: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
