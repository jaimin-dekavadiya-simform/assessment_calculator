/**
 * App factory for the Node HTTP API server.
 *
 * Zero-dependency: built on Node's built-in `node:http` only (no Express), so
 * the server and its tests run with a plain `node` invocation and no
 * `npm install` step. See docs/adr/0001-zero-dependency-http-server.md.
 *
 * `createApp()` returns a plain `(req, res)` request handler that applies CORS
 * headers and request logging to every response, then routes the request.
 * It never calls `.listen()` itself, which keeps it directly testable.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function defaultLogger(message) {
  console.log(message);
}

function logRequest(logger, req, statusCode, startedAt) {
  const durationMs = Date.now() - startedAt;
  logger(`${new Date().toISOString()} ${req.method} ${req.url} -> ${statusCode} (${durationMs}ms)`);
}

export default function createApp({ logger = defaultLogger } = {}) {
  return function handleRequest(req, res) {
    const startedAt = Date.now();

    // CORS: apply to every response, including preflight and errors.
    for (const [headerName, headerValue] of Object.entries(CORS_HEADERS)) {
      res.setHeader(headerName, headerValue);
    }

    // CORS preflight: acknowledge with an empty 204 and stop here.
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      logRequest(logger, req, 204, startedAt);
      return;
    }

    let statusCode;
    let payload;

    try {
      const { pathname } = new URL(req.url, "http://localhost");

      if (req.method === "GET" && pathname === "/api/v1/health") {
        statusCode = 200;
        payload = JSON.stringify({ status: "ok" });
      } else {
        statusCode = 404;
        payload = JSON.stringify({ error: "Not Found" });
      }
    } catch {
      // A malformed request target must not crash the process.
      statusCode = 500;
      payload = JSON.stringify({ error: "Internal Server Error" });
    }

    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(payload);

    logRequest(logger, req, statusCode, startedAt);
  };
}
