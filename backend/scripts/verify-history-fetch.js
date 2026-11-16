const http = require('http');
const app = require('../src/app');

let server;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'object' ? JSON.stringify(body) : body);
    }
    req.end();
  });
}

async function verifyHistoryFetch() {
  server = app.listen(5093);
  const port = server.address().port;

  try {
    // 1. Login
    const loginRes = await request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin@stocksync.com', password: 'Admin@123456' }
    );
    const token = loginRes.body.data.token;

    // 2. Fetch history with no search (All History)
    const histRes = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/history?limit=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('Status code:', histRes.statusCode);
    const records = histRes.body.data;
    console.log('Total records returned:', records?.length);
    console.log('Top 5 records:');
    records.slice(0, 5).forEach((r) => {
      console.log(`- [${r.action}] ${r.quantity}x ${r.product_name} | Customer/Party: "${r.customer_name || r.party_name}" | Phone: "${r.customer_phone}" | Amount: $${r.total_amount}`);
    });

    // 3. Search by Phone "010800994" (the user's phone number!)
    const phoneRes = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/history?search=010800994',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const phoneRecords = phoneRes.body.data;
    console.log('\nSearching by phone "010800994":', phoneRecords?.length, 'records found:');
    phoneRecords.forEach((r) => {
      console.log(`- [${r.action}] ${r.quantity}x ${r.product_name} | Customer: "${r.customer_name}" | Tel: "${r.customer_phone}"`);
    });

    if (!records || records.length === 0) {
      throw new Error('History returned 0 records!');
    }
    if (!phoneRecords || phoneRecords.length === 0) {
      throw new Error('Phone search returned 0 records for 010800994!');
    }

    console.log('\nVERIFICATION SUCCESSFUL! History records exist and are correctly queryable.');
  } finally {
    server.close();
  }
}

verifyHistoryFetch().catch((err) => {
  console.error('Failed:', err);
  if (server) server.close();
  process.exit(1);
});

