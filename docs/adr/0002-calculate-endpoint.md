# ADR 0002: Binary arithmetic API — POST /api/v1/calculate

## Status

Accepted

## Context

ADR 0001 established a dependency-free Node HTTP server with a static file
server, CORS, request logging, and a `GET /api/v1/health` endpoint. The next
need is a JSON API for the calculator's binary arithmetic so cross-origin
consumers can evaluate simple expressions without touching the browser app:
`operation` (`add`, `subtract`, `multiply`, `divide`) plus two numeric
operands `a` and `b`.

Constraints inherited from ADR 0001:

- No external dependencies (no Express, no runtime npm packages).
- Error responses keep the server's existing `{"error": "<message>"}` JSON
  shape and HTTP status conventions (400/403/404/405 already use it).
- `server.js` must keep exporting `createApp(rootDir)` and
  `startServer({port, host, rootDir})`; tests boot per-test ephemeral servers.
- Everything else stays a read-only static server (only GET/HEAD) — the new
  POST route must not weaken that gate for other paths.

## Decision

1. **Endpoint:** `POST /api/v1/calculate`. Any other method on that path gets
   `405 {"error":"Method Not Allowed"}` with an `Allow: POST` header; CORS
   preflight (`OPTIONS`) still returns 204 for every path.
2. **Request:** a JSON object body
   `{"operation": "add"|"subtract"|"multiply"|"divide", "a": <number>, "b": <number>}`.
   Bodies are read as UTF-8 up to a 1 MiB cap (larger → `413 {"error":"Payload Too Large"}`).
3. **Success:** `200 {"operation": ..., "a": ..., "b": ..., "result": ...}`.
   `operation`, `a`, and `b` are echoed exactly as received; `result` is the
   IEEE-754 result of the operation. No rounding or string coercion is applied
   anywhere.
4. **Validation (each failure returns `400 {"error": "<message>"}`):** checks
   run in the order below, so a payload that fails several checks reports the
   first one only:

   | Condition | Error message |
   | --- | --- |
   | Body is not valid JSON (or unreadable) | `Request body must be valid JSON` |
   | JSON value is not a plain object (null, array, scalar) | `Request body must be a JSON object` |
   | `operation` missing | `Missing required field: operation` |
   | `a` missing | `Missing required field: a` |
   | `b` missing | `Missing required field: b` |
   | `a` is not a JSON number (string, null, array, …) | `a must be a number` |
   | `b` is not a JSON number | `b must be a number` |
   | `a` is not finite (`Infinity`/`-Infinity`, e.g. `1e999`) | `a must be a finite number` |
   | `b` is not finite | `b must be a finite number` |
   | `operation` is not one of the four supported strings | `Unsupported operation: <value>` |
   | `operation` is `divide` and `b` is `0` (incl. `-0`) | `Division by zero` |
   | arithmetic overflows to a non-finite `result` (e.g. `1e308 + 1e308`) | `Result is not a finite number` |

5. **Strict typing:** `a` and `b` must be JSON numbers. Numeric strings such
   as `"2"` are rejected (`must be a number`); no coercion is performed.
   `NaN` cannot be represented in JSON; `Infinity`/`-Infinity` inputs are
   caught by the finiteness checks.
6. **Extra fields** in the request object are ignored.
7. **Implementation:** arithmetic lives in a frozen `OPERATIONS` map
   (`add`/`subtract`/`multiply`/`divide` → pure functions). The supported
   check uses `Object.hasOwn` so inherited property names (e.g. `toString`)
   are never treated as operations.
8. **Testing:** `test/calculate.test.js` mirrors the ephemeral-port harness of
   `test/health.test.js` and covers every success branch (all four operations,
   negative/decimal/zero operands, floating-point tolerance, echo and
   extra-field behaviour) and every error branch in the table above, plus 405
   and OPTIONS behaviour. `npm test` runs `node --test test/` so both suites
   are exercised.

## Consequences

- Cross-origin consumers get a predictable, dependency-free arithmetic API;
  unsupported operations and malformed input always fail with a `400` and a
  human-readable `error` string consistent with the rest of the server.
- The server remains read-only for static files: the POST route is the only
  non-GET/HEAD path and is matched before the static gate.
- JSON is strict: callers must send real numbers (a string like `"2"` is an
  error), which keeps the API unambiguous at the cost of a small amount of
  client-side ceremony.
- Errors are all HTTP 400 rather than distinguishing 422-style domain errors,
  matching ADR 0001's simple `{error}` convention; this is a deliberate choice
  for a dependency-free assessment server.
