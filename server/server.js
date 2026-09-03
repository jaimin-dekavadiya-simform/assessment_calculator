/**
 * Entrypoint: boots the API server on `process.env.PORT` (default 3000).
 *
 * Run with:
 *   npm start
 *   node server/server.js
 */

import http from "node:http";
import createApp from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(createApp());

server.on("error", (error) => {
  console.error(`[api] server error: ${error.message}`);
  process.exitCode = 1;
});

server.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] health check: http://localhost:${PORT}/api/v1/health`);
});
