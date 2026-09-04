/**
 * test/calculate.test.js — automated endpoint tests for the binary arithmetic
 * API in server.js (POST /api/v1/calculate).
 *
 * Run with: node --test test/calculate.test.js
 *
 * Contract under test (documented in docs/adr/0002-calculate-endpoint.md):
 *   Request : JSON { operation: "add"|"subtract"|"multiply"|"divide",
 *                    a: <finite number>, b: <finite number> }
 *   Success : 200 {"operation","a","b","result"}
 *   Errors  : 400 {"error": "..."} for missing / non-numeric / non-finite
 *             fields, unsupported operations and division by zero; 400 for
 *             malformed JSON bodies; 413 for oversized bodies; 405 for any
 *             method other than POST.
 *
 * Each test boots its own server on an ephemeral port (port 0) so tests never
 * collide with each other or with anything else on the machine, then shuts the
 * server down in a finally block. Requests use `agent: false` so no keep-alive
 * socket keeps the test process alive after shutdown.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { createApp } from "../server.js";

const HOST = "127.0.0.1";
const CALC_PATH = "/api/v1/calculate";

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

/**
 * Perform one HTTP request and resolve with { statusCode, headers, body }.
 * When `body` is given it is sent verbatim with an explicit Content-Length.
 */
function httpRequest({ port, method = "GET", path = "/", headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: HOST,
        port,
        method,
        path,
        headers,
        agent: false,
      },
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
    if (body !== undefined) {
      const data = Buffer.from(body, "utf8");
      req.setHeader("Content-Length", data.length);
      req.end(data);
    } else {
      req.end();
    }
  });
}

/** POST a JSON object to /api/v1/calculate and resolve with the response. */
function postJson(port, payload) {
  return httpRequest({
    port,
    method: "POST",
    path: CALC_PATH,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** POST a raw (possibly non-JSON) body and resolve with the response. */
function postRaw(port, body) {
  return httpRequest({
    port,
    method: "POST",
    path: CALC_PATH,
    headers: { "Content-Type": "application/json" },
    body,
  });
}

test("POST /api/v1/calculate returns 200 with {operation,a,b,result} for add", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await postJson(port, { operation: "add", a: 2, b: 3 });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"], /^application\/json/);
    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.deepEqual(JSON.parse(response.body), {
      operation: "add",
      a: 2,
      b: 3,
      result: 5,
    });
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate computes all four supported operations", async () => {
  const cases = [
    { operation: "subtract", a: 10, b: 4, result: 6 },
    { operation: "multiply", a: 3, b: 2.5, result: 7.5 },
    { operation: "divide", a: 7, b: 2, result: 3.5 },
    { operation: "add", a: -1.5, b: 0.5, result: -1 },
    { operation: "multiply", a: 0, b: 5, result: 0 },
  ];

  const server = createApp();
  try {
    const port = await listen(server);
    for (const { operation, a, b, result } of cases) {
      const response = await postJson(port, { operation, a, b });
      assert.equal(response.statusCode, 200, `${operation} should succeed`);
      assert.deepEqual(
        JSON.parse(response.body),
        { operation, a, b, result },
        `${operation}(${a}, ${b}) should equal ${result}`
      );
    }
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate handles floating-point operands with tolerance", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    const third = await postJson(port, { operation: "divide", a: 1, b: 3 });
    assert.equal(third.statusCode, 200);
    assert.ok(Math.abs(JSON.parse(third.body).result - 1 / 3) < 1e-12);

    const decimalSum = await postJson(port, {
      operation: "add",
      a: 0.1,
      b: 0.2,
    });
    assert.equal(decimalSum.statusCode, 200);
    assert.ok(Math.abs(JSON.parse(decimalSum.body).result - 0.3) < 1e-9);
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate echoes operands as sent and ignores extra fields", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await postJson(port, {
      operation: "divide",
      a: 2.5,
      b: 4,
      debug: true,
    });

    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.equal(payload.operation, "divide");
    assert.equal(payload.a, 2.5);
    assert.equal(payload.b, 4);
    assert.equal(payload.result, 0.625);
    assert.deepEqual(Object.keys(payload).sort(), [
      "a",
      "b",
      "operation",
      "result",
    ]);
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects a missing operation field", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await postJson(port, { a: 2, b: 3 });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), {
      error: "Missing required field: operation",
    });
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects missing a and b fields", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    const missingA = await postJson(port, { operation: "add", b: 3 });
    assert.equal(missingA.statusCode, 400);
    assert.deepEqual(JSON.parse(missingA.body), {
      error: "Missing required field: a",
    });

    const missingB = await postJson(port, { operation: "add", a: 2 });
    assert.equal(missingB.statusCode, 400);
    assert.deepEqual(JSON.parse(missingB.body), {
      error: "Missing required field: b",
    });
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects empty and malformed JSON bodies", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    for (const raw of ["", "   ", "{not json", "{operation: \"add\"}"]) {
      const response = await postRaw(port, raw);
      assert.equal(response.statusCode, 400, `body ${JSON.stringify(raw)}`);
      assert.deepEqual(JSON.parse(response.body), {
        error: "Request body must be valid JSON",
      });
    }
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects JSON bodies that are not plain objects", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    for (const raw of ["null", "true", "\"add\"", "[1, 2]", "42"]) {
      const response = await postRaw(port, raw);
      assert.equal(response.statusCode, 400, `body ${raw}`);
      assert.deepEqual(JSON.parse(response.body), {
        error: "Request body must be a JSON object",
      });
    }
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects non-numeric a and b values", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    const badA = await postJson(port, { operation: "add", a: "abc", b: 1 });
    assert.equal(badA.statusCode, 400);
    assert.deepEqual(JSON.parse(badA.body), { error: "a must be a number" });

    const numericStringB = await postJson(port, {
      operation: "add",
      a: 1,
      b: "2",
    });
    assert.equal(numericStringB.statusCode, 400);
    assert.deepEqual(JSON.parse(numericStringB.body), {
      error: "b must be a number",
    });

    const nullB = await postJson(port, { operation: "add", a: 1, b: null });
    assert.equal(nullB.statusCode, 400);
    assert.deepEqual(JSON.parse(nullB.body), { error: "b must be a number" });

    const arrayA = await postJson(port, { operation: "add", a: [1], b: 2 });
    assert.equal(arrayA.statusCode, 400);
    assert.deepEqual(JSON.parse(arrayA.body), { error: "a must be a number" });

    const objectB = await postJson(port, { operation: "add", a: 1, b: {} });
    assert.equal(objectB.statusCode, 400);
    assert.deepEqual(JSON.parse(objectB.body), { error: "b must be a number" });
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects NaN/Infinity operands", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    // JSON numbers beyond the double range parse as Infinity/-Infinity
    // (JSON.stringify cannot express them, so send the raw JSON text).
    const infA = await postRaw(port, '{"operation":"add","a":1e999,"b":1}');
    assert.equal(infA.statusCode, 400);
    assert.deepEqual(JSON.parse(infA.body), {
      error: "a must be a finite number",
    });

    const negInfB = await postRaw(
      port,
      '{"operation":"add","a":1,"b":-1e999}'
    );
    assert.equal(negInfB.statusCode, 400);
    assert.deepEqual(JSON.parse(negInfB.body), {
      error: "b must be a finite number",
    });
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects unsupported operations", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    const unknown = await postJson(port, { operation: "power", a: 2, b: 3 });
    assert.equal(unknown.statusCode, 400);
    assert.deepEqual(JSON.parse(unknown.body), {
      error: "Unsupported operation: power",
    });

    const nonString = await postJson(port, { operation: 42, a: 2, b: 3 });
    assert.equal(nonString.statusCode, 400);
    assert.deepEqual(JSON.parse(nonString.body), {
      error: "Unsupported operation: 42",
    });
  } finally {
    await close(server);
  }
});

test("POST /api/v1/calculate rejects division by zero", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    const byZero = await postJson(port, { operation: "divide", a: 5, b: 0 });
    assert.equal(byZero.statusCode, 400);
    assert.deepEqual(JSON.parse(byZero.body), { error: "Division by zero" });

    const zeroOverZero = await postJson(port, {
      operation: "divide",
      a: 0,
      b: 0,
    });
    assert.equal(zeroOverZero.statusCode, 400);
    assert.deepEqual(JSON.parse(zeroOverZero.body), {
      error: "Division by zero",
    });

    // Division by zero must not leak Infinity through as a 200.
    assert.equal(JSON.parse(byZero.body).result, undefined);
  } finally {
    await close(server);
  }
});

test("/api/v1/calculate answers 405 for methods other than POST", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const response = await httpRequest({
        port,
        method,
        path: CALC_PATH,
      });
      assert.equal(response.statusCode, 405, `${method} should be rejected`);
      assert.deepEqual(JSON.parse(response.body), {
        error: "Method Not Allowed",
      });
      assert.equal(response.headers.allow, "POST");
    }
  } finally {
    await close(server);
  }
});

test("OPTIONS /api/v1/calculate answers the CORS preflight with 204", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await httpRequest({
      port,
      method: "OPTIONS",
      path: CALC_PATH,
      headers: {
        Origin: "http://example.com",
        "Access-Control-Request-Method": "POST",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.ok(
      response.headers["access-control-allow-methods"]
        .split(", ")
        .includes("POST")
    );
  } finally {
    await close(server);
  }
});
