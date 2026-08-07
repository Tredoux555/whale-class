// Minimal healthcheck responder for Railway.
//
// 🚨 WHY THIS EXISTS: the repo-root railway.json declares
// `deploy.healthcheckPath = "/api/health"`, and that deploy config applies to
// EVERY service in the Railway project — the per-service Settings field does
// not reliably override it (this is the same trap the montage-worker service
// hit on 2026-07-22). A render worker has no HTTP server, so without this the
// deploy is marked unhealthy and Railway restart-loops a perfectly working
// worker.
//
// So: bind $PORT, answer 200 on anything, and get out of the way. Zero deps,
// a few bytes of RAM, never touches the queue or the database.

import http from 'node:http';

const port = Number(process.env.PORT) || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, service: 'potato-worker' }));
});

server.on('error', (err) => {
  // Never take the worker down over the health stub.
  console.warn('[health] server error:', err.message);
});

server.listen(port, () => {
  console.log(`[health] listening on ${port}`);
});
