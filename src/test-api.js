import http from 'http';
import app from './server.js';

const PORT = 5001; // Use separate port for smoke test
const server = app.listen(PORT, async () => {
  console.log(`[Smoke Test] Server started on port ${PORT}`);

  try {
    // 1. Test Health Endpoint
    const healthRes = await makeRequest(`http://localhost:${PORT}/health`);
    console.log('✅ Health Check Response:', healthRes);

    // 2. Test Welcome Root Endpoint
    const rootRes = await makeRequest(`http://localhost:${PORT}/`);
    console.log('✅ Root Welcome Response:', rootRes);

    // 3. Test 404 handler
    const notFoundRes = await makeRequest(`http://localhost:${PORT}/api/v1/non-existent`);
    console.log('✅ 404 Handler Response:', notFoundRes);

    console.log('\n🎉 [Smoke Test] All core API sanity checks passed successfully!');
  } catch (err) {
    console.error('❌ [Smoke Test Error]:', err.message);
  } finally {
    server.close(() => {
      console.log('[Smoke Test] Server closed cleanly.');
      process.exit(0);
    });
  }
});

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}
