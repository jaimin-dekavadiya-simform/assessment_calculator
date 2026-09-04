/**
 * test/frontendIntegration.test.js — automated frontend integration tests for
 * the calculator's HTTP arithmetic client (src/UI/apiClient.js).
 *
 * Run with: node --test test/frontendIntegration.test.js
 *
 * These tests replace the global fetch with a mock (no real server, no
 * network) and verify that requestCalculation(operation, a, b):
 *   1. POSTs the right JSON to /api/v1/calculate and, on success, resolves
 *      with the numeric `result` from the response;
 *   2. parses the server's {"error": "<message>"} body and rejects with that
 *      message when the API answers with an HTTP error;
 *   3. rejects with a descriptive message when the response body is not JSON;
 *   4. rejects with a descriptive message when the fetch itself fails
 *      (server unreachable, offline, CORS failure, ...).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { requestCalculation } from "../src/UI/apiClient.js";

/**
 * Build a fetch mock whose responses carry the given status/body. Records every
 * call as { url, options } on fetchMock.calls so tests can assert the request
 * that was actually sent.
 */
function installFetchMock({ status = 200, ok = true, body }) {
  const calls = [];
  const fetchMock = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok,
      status,
      json: async () => body,
    };
  };
  fetchMock.calls = calls;
  return fetchMock;
}

test("requestCalculation POSTs JSON to /api/v1/calculate and resolves the result on success", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const fetchMock = installFetchMock({
      ok: true,
      status: 200,
      body: { operation: "add", a: 2, b: 3, result: 5 },
    });
    globalThis.fetch = fetchMock;

    const result = await requestCalculation("add", 2, 3);

    assert.equal(result, 5);
    assert.equal(fetchMock.calls.length, 1);

    const { url, options } = fetchMock.calls[0];
    assert.equal(url, "/api/v1/calculate");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), {
      operation: "add",
      a: 2,
      b: 3,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestCalculation handles every supported operation, including floating-point results", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const cases = [
      ["subtract", 10, 4, 6],
      ["multiply", 3, 2.5, 7.5],
      ["divide", 7, 2, 3.5],
      ["divide", 1, 3, 1 / 3],
    ];
    for (const [operation, a, b, result] of cases) {
      globalThis.fetch = installFetchMock({
        ok: true,
        status: 200,
        body: { operation, a, b, result },
      });

      const resolved = await requestCalculation(operation, a, b);
      assert.equal(resolved, result, `${operation}(${a}, ${b}) result`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestCalculation rejects with the server error message on an error response", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = installFetchMock({
      ok: false,
      status: 400,
      body: { error: "Division by zero" },
    });

    await assert.rejects(
      requestCalculation("divide", 5, 0),
      (error) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "Division by zero");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestCalculation rejects with a fallback message when an error body is not JSON", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    await assert.rejects(
      requestCalculation("multiply", 2, 3),
      (error) => {
        assert.equal(error.message, "Calculation request failed (HTTP 500)");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestCalculation rejects when the network request itself fails", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };

    await assert.rejects(
      requestCalculation("add", 1, 2),
      (error) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "Unable to reach the calculation service");
        assert.ok(error.cause instanceof TypeError);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
