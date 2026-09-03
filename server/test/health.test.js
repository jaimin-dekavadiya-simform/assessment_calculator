/**
 * Node tests for the API server's health endpoint.
 *
 * Run with:
 *   node --test server/test/health.test.js
 *   npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import createApp from "../app.js";

/** Boot the app on an ephemeral port; resolves with the server and base URL. */
function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

/** Issue an HTTP request and collect status, headers and raw body. */
function request(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      // agent:false → one-off connection, no keep-alive, so the server
      // can close cleanly once the test finishes.
      { method, agent: false },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({ statusCode: res.statusCode, headers: res.headers, body }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

test("GET /api/v1/health returns 200 with { status: 'ok' } and CORS headers", async () => {
  const logs = [];
  const app = createApp({ logger: (line) => logs.push(line) });
  const { server, baseUrl } = await startServer(app);

  try {
    const res = await request(`${baseUrl}/api/v1/health`);

    assert.equal(res.statusCode, 200);
    assert.match(res.headers["content-type"], /application\/json/);
    assert.deepEqual(JSON.parse(res.body), { status: "ok" });
    assert.equal(res.headers["access-control-allow-origin"], "*");
    assert.ok(
      logs.some(
        (line) => line.includes("GET /api/v1/health") && line.includes("200"),
      ),
      "request logger should record the health request",
    );
  } finally {
    await stopServer(server);
  }
});

test("unknown routes return 404 with a JSON error body", async () => {
  const { server, baseUrl } = await startServer(createApp({ logger: () => {} }));

  try {
    const res = await request(`${baseUrl}/api/v1/nope`);

    assert.equal(res.statusCode, 404);
    assert.match(res.headers["content-type"], /application\/json/);
    assert.deepEqual(JSON.parse(res.body), { error: "Not Found" });
  } finally {
    await stopServer(server);
  }
});

test("OPTIONS preflight is answered with 204 and CORS headers", async () => {
  const { server, baseUrl } = await startServer(createApp({ logger: () => {} }));

  try {
    const res = await request(`${baseUrl}/api/v1/health`, "OPTIONS");

    assert.equal(res.statusCode, 204);
    assert.equal(res.headers["access-control-allow-origin"], "*");
    assert.ok(
      res.headers["access-control-allow-methods"].includes("GET"),
      "CORS should advertise GET among allowed methods",
    );
  } finally {
    await stopServer(server);
  }
});
