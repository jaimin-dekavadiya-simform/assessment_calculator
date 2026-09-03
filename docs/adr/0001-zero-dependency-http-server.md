# ADR-0001: Zero-dependency Node HTTP API server

## Status

Accepted

## Context

The repository is a browser-only scientific calculator whose stated convention is
"no external dependencies" and "no build step or server required" (see
`README.md`). A new workstream adds a Node HTTP API with CORS, request logging and
a `GET /api/v1/health` endpoint, verified via `node --test server/test/health.test.js`.

The conventional choice for a small Node API is Express, but Express (plus CORS
and logging middleware) would introduce third-party dependencies and require an
`npm install` (and a lockfile) before the verification command can run.

## Decision

Build the API server on Node's built-in modules only:

- `node:http` for the server and request handling;
- hand-rolled CORS headers and request logging in a small middleware-style layer;
- `node:test` + `node:assert/strict` for tests.

Layout:

- `server/app.js` — exports `createApp({ logger })`, a request-handler factory
  that never calls `.listen()`, so it can be exercised directly by tests.
  `logger` is injectable; it defaults to `console.log` when the app runs for real.
- `server/server.js` — entrypoint that boots `createApp()` on
  `process.env.PORT` (default 3000).
- `server/test/health.test.js` — boots the app on an ephemeral port and asserts
  over real HTTP.
- `package.json` — `"type": "module"` (matches the existing ES-module codebase),
  `npm start`, and `npm test` (mirrors the verification command).

Routes (currently only the health check) are matched on the URL pathname after
CORS and preflight handling, so query strings do not break routing.

## Consequences

- `node --test server/test/health.test.js` (or `npm test`) works with a stock
  Node.js >= 18 install: no package installation, lockfile, or network access.
- The repository's no-external-dependencies convention is preserved.
- If a framework or extra middleware is needed later, `createApp()` returns a
  plain `(req, res)` handler that can be mounted in or wrapped by Express
  without changing the route logic or the tests' HTTP-level assertions.
- Request logging and CORS are hand-maintained; adding headers/log formats is
  trivial but is our responsibility rather than a middleware package's.
