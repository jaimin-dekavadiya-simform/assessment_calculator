/**
 * test/evaluate.test.js — automated endpoint tests for the safe expression
 * evaluation API in server.js (POST /api/v1/evaluate).
 *
 * Run with: node --test test/evaluate.test.js
 *
 * Contract under test (documented in docs/adr/0003-evaluate-endpoint.md):
 *   Request : JSON { expression: "<string>" }
 *   Success : 200 {"expression": <echoed string>, "result": <number>}
 *   Errors  : 400 {"error": "INVALID_INPUT"}      — expression missing or
 *             not a JSON string
 *             400 {"error": "INVALID_EXPRESSION"} — expression is a string
 *             the tokenizer/parser/evaluator reject (malformed syntax,
 *             unknown characters, division by zero, math-domain errors,
 *             non-finite overflow, ...)
 *             plus the server-wide protocol conventions shared with
 *             /api/v1/calculate (invalid JSON, non-object bodies, 405, ...)
 *
 * Precedence coverage mirrors the browser test suite expectations in
 * src/test/calculatorTest.js: * binds tighter than +, parentheses override,
 * ^ is right-associative and binds tighter than unary minus, and - is
 * left-associative.
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
const EVAL_PATH = "/api/v1/evaluate";

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

/** POST a JSON object to /api/v1/evaluate and resolve with the response. */
function postJson(port, payload) {
  return httpRequest({
    port,
    method: "POST",
    path: EVAL_PATH,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** POST a raw (possibly non-JSON) body and resolve with the response. */
function postRaw(port, body) {
  return httpRequest({
    port,
    method: "POST",
    path: EVAL_PATH,
    headers: { "Content-Type": "application/json" },
    body,
  });
}

/**
 * Assert that `actual` is within `eps` (absolute) of `expected`. The endpoint
 * rounds results to 15 decimal places (same as the browser app), so a tiny
 * absolute tolerance is all that is needed.
 */
function assertAlmostEqual(actual, expected, eps = 1e-9) {
  assert.equal(typeof actual, "number", "result should be a number");
  assert.ok(
    Number.isFinite(actual),
    `result should be finite, got ${actual}`
  );
  assert.ok(
    Math.abs(actual - expected) <= eps,
    `expected result ${actual} to be within ${eps} of ${expected}`
  );
}

test("POST /api/v1/evaluate returns 200 with {expression,result} and echoes the expression verbatim", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const expression = "  2 + 2  ";
    const response = await postJson(port, { expression });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"], /^application\/json/);
    assert.equal(response.headers["access-control-allow-origin"], "*");
    const payload = JSON.parse(response.body);
    assert.equal(payload.expression, expression);
    assert.equal(payload.result, 4);
  } finally {
    await close(server);
  }
});

test("POST /api/v1/evaluate respects operator precedence", async () => {
  const cases = [
    // * binds tighter than +.
    { expression: "2+3*4", result: 14 },
    { expression: "5+3*2-8/4", result: 9 }, // 5 + 6 - 2
    // Parentheses override precedence.
    { expression: "(2+3)*4", result: 20 },
    { expression: "3+4*2/(1-5)", result: 1 },
    // ^ binds tighter than * and is right-associative: 2^(3^2).
    { expression: "2*3^4", result: 162 },
    { expression: "2^3^2", result: 512 },
    { expression: "(2^3)^2", result: 64 },
    // Unary minus binds looser than ^ but tighter than *: -(3^2), (-3)^2.
    { expression: "-3^2", result: -9 },
    { expression: "(-3)^2", result: 9 },
    { expression: "-2*3", result: -6 },
    // - is left-associative: (20-4)-3 and (3-2)-1.
    { expression: "20-4-3", result: 13 },
    { expression: "3-2-1", result: 0 },
    // Postfix factorial binds tighter than binary operators.
    { expression: "2+3!", result: 8 },
    { expression: "4!", result: 24 },
  ];

  const server = createApp();
  try {
    const port = await listen(server);
    for (const { expression, result } of cases) {
      const response = await postJson(port, { expression });
      assert.equal(
        response.statusCode,
        200,
        `${expression} should evaluate successfully`
      );
      const payload = JSON.parse(response.body);
      assert.equal(payload.expression, expression);
      assertAlmostEqual(payload.result, result, 1e-9);
    }
  } finally {
    await close(server);
  }
});

test("POST /api/v1/evaluate supports constants, functions and floating point with the browser's rounding", async () => {
  const cases = [
    { expression: "0.1+0.2", result: 0.3 },
    { expression: "1/3", result: 1 / 3 },
    { expression: "sin(π/6)", result: Math.sin(Math.PI / 6) },
    { expression: "cos(π)", result: Math.cos(Math.PI) },
    { expression: "2*π", result: 2 * Math.PI },
    { expression: "√(2+3)", result: Math.sqrt(5) },
    { expression: "log(1000)", result: Math.log10(1000) },
    { expression: "ln(e)", result: Math.log(Math.E) },
    { expression: "e^π", result: Math.E ** Math.PI },
  ];

  const server = createApp();
  try {
    const port = await listen(server);
    for (const { expression, result } of cases) {
      const response = await postJson(port, { expression });
      assert.equal(
        response.statusCode,
        200,
        `${expression} should evaluate successfully`
      );
      const payload = JSON.parse(response.body);
      assert.equal(payload.expression, expression);
      assertAlmostEqual(payload.result, result, 1e-9);
    }
  } finally {
    await close(server);
  }
});

test("POST /api/v1/evaluate ignores extra fields alongside expression", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await postJson(port, {
      expression: "2^10",
      debug: true,
      extra: [1, 2, 3],
    });

    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.equal(payload.expression, "2^10");
    assert.equal(payload.result, 1024);
    assert.deepEqual(Object.keys(payload).sort(), ["expression", "result"]);
  } finally {
    await close(server);
  }
});

test("POST /api/v1/evaluate returns INVALID_EXPRESSION for malformed or unevaluable expressions", async () => {
  const badExpressions = [
    "", // empty string
    "2+", // dangling operator
    "(3+4", // unclosed bracket
    "3+4)", // unmatched closing bracket
    "2**3", // two operators in a row
    "3 * * 4", // two operators in a row (spaced)
    "sin", // function with no argument
    "sin()", // function with empty argument list
    "()", // empty parentheses
    "abc", // unknown characters
    "@", // lexically invalid character
    "1/0", // division by zero
    "√(-1)", // square root of a negative
    "log(-1)", // log of a non-positive value
    "9^9^9", // overflows to Infinity
  ];

  const server = createApp();
  try {
    const port = await listen(server);
    for (const expression of badExpressions) {
      const response = await postJson(port, { expression });
      assert.equal(
        response.statusCode,
        400,
        `${JSON.stringify(expression)} should be rejected`
      );
      assert.deepEqual(
        JSON.parse(response.body),
        { error: "INVALID_EXPRESSION" },
        `${JSON.stringify(expression)} should fail with INVALID_EXPRESSION`
      );
    }
  } finally {
    await close(server);
  }
});

test("POST /api/v1/evaluate returns INVALID_INPUT when expression is missing or not a string", async () => {
  const badPayloads = [
    {}, // missing expression
    { expression: null },
    { expression: 42 },
    { expression: 3.14 },
    { expression: true },
    { expression: ["2+2"] },
    { expression: { nested: "2+2" } },
  ];

  const server = createApp();
  try {
    const port = await listen(server);
    for (const payload of badPayloads) {
      const response = await postJson(port, payload);
      assert.equal(
        response.statusCode,
        400,
        `${JSON.stringify(payload)} should be rejected`
      );
      assert.deepEqual(
        JSON.parse(response.body),
        { error: "INVALID_INPUT" },
        `${JSON.stringify(payload)} should fail with INVALID_INPUT`
      );
    }
  } finally {
    await close(server);
  }
});

test("POST /api/v1/evaluate rejects malformed JSON bodies", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    for (const raw of ["", "   ", "{not json", "{expression: \"2+2\"}"]) {
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

test("POST /api/v1/evaluate rejects JSON bodies that are not plain objects", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    for (const raw of ["null", "true", "\"2+2\"", "[1, 2]", "42"]) {
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

test("/api/v1/evaluate answers 405 for methods other than POST", async () => {
  const server = createApp();
  try {
    const port = await listen(server);

    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const response = await httpRequest({
        port,
        method,
        path: EVAL_PATH,
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

test("OPTIONS /api/v1/evaluate answers the CORS preflight with 204", async () => {
  const server = createApp();
  try {
    const port = await listen(server);
    const response = await httpRequest({
      port,
      method: "OPTIONS",
      path: EVAL_PATH,
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
