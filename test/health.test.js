/**
 * test/health.test.js — automated tests for the static server in server.js.
 *
 * Run with: node --test test/health.test.js
 *
 * Each test boots its own server on an ephemeral port (port 0) so tests never
 * collide with each other or with anything else running on the machine, then
 * shuts the server down in a finally block. Requests use `agent: false` so no
 * keep-alive socket keeps the test process alive after shutdown.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { createApp } from "../server.js";

const HOST = "127.0.0.1";

/** Start `server` on an ephemeral port and resolve with the chosen port. */
function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, () => {
      server.removeListener("error", reject);
      resolve(server.address().port);
    });
  });
}

/** Stop `server` once all open connections have finished. */
function close(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

/** Perform one HTTP request and resolve with { statusCode, headers, body }. */
function httpRequest({ port, method = "GET", path = "/", headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = request(
      { hostname: HOST, port, method, path, headers, agent: false },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("GET /api/v1/health responds 200 with {\"status\":\"ok\"}", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await httpRequest({ port, path: "/api/v1/health" });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"], /^application\/json/);
    assert.equal(response.body, '{"status":"ok"}');
    // Health endpoint must be reachable cross-origin too.
    assert.equal(response.headers["access-control-allow-origin"], "*");
  } finally {
    await close(server);
  }
});

test("serves index.html from the repo root", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await httpRequest({ port, path: "/" });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"], /^text\/html/);
    assert.ok(response.body.includes("Scientific Calculator"));
  } finally {
    await close(server);
  }
});

test("returns 404 for an unknown path", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await httpRequest({ port, path: "/definitely-missing.txt" });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Not Found" });
  } finally {
    await close(server);
  }
});

test("answers OPTIONS preflight with permissive CORS headers", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await httpRequest({
      port,
      method: "OPTIONS",
      path: "/api/v1/health",
      headers: {
        Origin: "http://example.com",
        "Access-Control-Request-Method": "GET",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.ok(
      response.headers["access-control-allow-methods"]
        .split(", ")
        .includes("OPTIONS")
    );
  } finally {
    await close(server);
  }
});
