const app = require('../server');
const http = require('http');

async function testOfficers() {
  const server = http.createServer(app);
  server.listen(0, async () => {
    const port = server.address().port;
    console.log(`Test server running on port ${port}`);

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/officers`);
      const data = await res.json();

      console.log('--- Officers Endpoint Response Test ---');
      console.log('HTTP Status:', res.status);
      console.log('Success:', data.success);
      console.log('Officer Count:', data.data?.length);

      if (data.data && data.data.length > 0) {
        const first = data.data[0];
        console.log('Fields in first officer:', Object.keys(first).join(', '));
        const hasHash = data.data.some(o => 'passwordHash' in o || 'password' in o);
        console.log('Contains passwordHash or password:', hasHash);
        if (hasHash) {
          console.error('❌ FAIL: passwordHash found in officers response!');
          process.exit(1);
        } else {
          console.log('✅ PASS: Strictly zero password hashes or credential fields in response.');
        }
      }
    } catch (e) {
      console.error('Test error:', e.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testOfficers().catch(console.error);

