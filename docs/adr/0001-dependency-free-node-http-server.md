# ADR 0001: Dependency-free Node HTTP server with health endpoint

## Status

Accepted

## Context

The Scientific Calculator was designed as a browser-only application with no
build step and no server. A need arose for a local HTTP server that can serve
the static site, speak CORS for cross-origin consumers, and expose a health
endpoint (`GET /api/v1/health -> {"status":"ok"}`) for tooling and probes.

Constraints:

- No external dependencies (no Express, no npm packages at runtime).
- Must be startable on an arbitrary/ephemeral port for automated tests.
- Must not disturb the existing browser module loading of `index.html` and
  `src/**`.

## Decision

1. **File layout:** add `package.json`, `server.js` (repo root), and
   `test/health.test.js`. The repository previously had no `package.json`;
   this is the first one.
2. **Module system:** `package.json` sets `"type": "module"`, so `server.js`
   and the test are ES modules — consistent with the app's existing ES-module
   source. `engines.node` is `>=18` because the verification command uses
   Node's built-in test runner (`node --test`).
3. **Server shape:** `server.js` exports `createApp(rootDir)` (returns an
   `http.Server` that does not listen yet) and `startServer({port, host,
   rootDir})` (binds and logs the URL). Running `node server.js` directly
   detects main-module execution via `import.meta.url` vs `process.argv[1]`.
4. **Behaviour:** serves static files from the repo root (`index.html` for
   directory requests), applies permissive CORS headers to every response and
   answers `OPTIONS` preflights with 204, logs each request with status and
   duration, and answers `GET /api/v1/health` with `{"status":"ok"}` JSON.
   Path traversal and hidden-file requests are rejected.
5. **Testing:** `test/health.test.js` uses `node:test`/`node:assert` only.
   Each test calls `createApp()` and `server.listen(0, "127.0.0.1")` so the OS
   assigns an ephemeral port, then shuts the server down in a `finally` block.
   Requests use `agent: false` so no keep-alive socket keeps the test process
   alive.

## Consequences

- The app can still be opened directly from disk (no server required), and can
  additionally be served via `npm start` / `node server.js`.
- No runtime or dev dependencies were added; `npm install` is unnecessary.
- Adding `"type": "module"` affects how Node interprets every `.js` file in
  the repo; the browser files were already ES modules so nothing changes for
  them.
- Tests are independent and parallel-safe (each boots its own ephemeral
  listener), and the suite is runnable with `node --test test/health.test.js`.
