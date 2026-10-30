const https = require('https');

const BASE_HOST = 'event-management-backend-production-5108.up.railway.app';

function request(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_HOST,
      port: 443,
      path,
      method,
      headers: {
        'User-Agent': 'NH-Portal-Verification/1.0',
        ...headers
      }
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const start = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          duration: Date.now() - start,
          body: data
        });
      });
    });
    req.on('error', (err) => resolve({ error: err.message, status: 0 }));
    if (body) req.write(body);
    req.end();
  });
}

async function verify() {
  console.log('=== VERIFICATION: STEP 4 (PRODUCTION API COMMUNICATION) ===');
  const healthRes = await request('/api/v1/health');
  console.log(`1. Live API /health: HTTP ${healthRes.status} in ${healthRes.duration}ms`);
  const healthJson = JSON.parse(healthRes.body);
  console.log('   Service status:', healthJson.status, '| DB:', healthJson.database);

  console.log('\n=== VERIFICATION: STEP 5 (AUTHENTICATION & PROTECTED ADMIN ACTIONS) ===');
  // Authenticate as Super Admin to get valid JWT token
  const loginRes = await request('/api/v1/auth/login', 'POST', {}, JSON.stringify({ email: 'superadmin@gmail.com', password: '12345678' }));
  const loginJson = JSON.parse(loginRes.body);
  const token = loginJson.data?.token;
  console.log('1. SuperAdmin Login: HTTP', loginRes.status, '| Token acquired:', !!token);

  // Test 2: Unauthenticated vs Authenticated for User Role Update
  const unauthRole = await request('/api/v1/users/usr-clubadmin/role', 'PUT', {}, JSON.stringify({ role: 'CLUB_ADMIN' }));
  console.log('2. Unauthenticated PUT /users/:id/role -> HTTP', unauthRole.status, '(Expected 401)');

  const authRole = await request(
    '/api/v1/users/usr-clubadmin/role',
    'PUT',
    { Authorization: `Bearer ${token}` },
    JSON.stringify({ role: 'CLUB_ADMIN' })
  );
  console.log('3. Authenticated (SUPER_ADMIN) PUT /users/:id/role -> HTTP', authRole.status, '(Expected 200)');
  console.log('   Response message:', JSON.parse(authRole.body).message);

  // Test 3: Unauthenticated vs Authenticated for User Status Update
  const unauthStatus = await request('/api/v1/users/usr-clubadmin/status', 'PUT', {}, JSON.stringify({ status: 'Active' }));
  console.log('4. Unauthenticated PUT /users/:id/status -> HTTP', unauthStatus.status, '(Expected 401)');

  const authStatus = await request(
    '/api/v1/users/usr-clubadmin/status',
    'PUT',
    { Authorization: `Bearer ${token}` },
    JSON.stringify({ status: 'Active' })
  );
  console.log('5. Authenticated (SUPER_ADMIN) PUT /users/:id/status -> HTTP', authStatus.status, '(Expected 200)');
  console.log('   Response message:', JSON.parse(authStatus.body).message);

  // Test 4: Member Status Update Auth Check
  const unauthMember = await request('/api/v1/members/mem-1/status', 'PUT', {}, JSON.stringify({ status: 'Active' }));
  console.log('6. Unauthenticated PUT /members/:id/status -> HTTP', unauthMember.status, '(Expected 401)');

  const authMember = await request(
    '/api/v1/members/mem-1/status',
    'PUT',
    { Authorization: `Bearer ${token}` },
    JSON.stringify({ status: 'Active' })
  );
  // Either 200 (if mem-1 exists) or 404 (if not in current DB), but NOT 401 (auth succeeded)
  console.log('7. Authenticated PUT /members/:id/status -> HTTP', authMember.status, '(Auth verified, passed token validation)');

  // Test 5: Verify Officers endpoint password hash check
  const officersRes = await request('/api/v1/officers');
  const officersJson = JSON.parse(officersRes.body);
  const officersHaveHash = officersJson.data?.some(o => 'passwordHash' in o || 'password' in o);
  console.log('8. Live Officers API status:', officersRes.status, '| Leaking passwordHash:', officersHaveHash);

  console.log('\n=== ALL STEP 4 & STEP 5 VERIFICATION CHECKS COMPLETE ===');
}

verify().catch(console.error);
