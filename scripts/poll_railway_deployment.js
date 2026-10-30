const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, raw: data.slice(0, 100) }); }
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function poll() {
  for (let i = 0; i < 8; i++) {
    const officers = await get('https://event-management-backend-production-5108.up.railway.app/api/v1/officers');
    const states = await get('https://event-management-backend-production-5108.up.railway.app/api/v1/states');
    const hasHash = officers.body?.data && officers.body.data.length > 0 ? ('passwordHash' in officers.body.data[0]) : null;
    const statesCount = states.body?.data ? states.body.data.length : null;
    
    console.log(`[Check ${i + 1}] States count: ${statesCount} | Officers has passwordHash: ${hasHash}`);
    if (hasHash === false || statesCount === 50) {
      console.log('🚀 Verified: New deployment is LIVE on Railway!');
      return;
    }
    await new Promise(r => setTimeout(r, 10000));
  }
}

poll().catch(console.error);

