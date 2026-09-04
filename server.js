/**
 * server.js — dependency-free Node HTTP server for the Scientific Calculator.
 *
 * Features:
 *  - Serves static files from the repository root (the folder this file is in).
 *    Directory requests (e.g. "/") resolve to index.html inside that directory.
 *  - Permissive CORS: every response carries `Access-Control-Allow-Origin: *`
 *    and OPTIONS preflight requests are answered with 204.
 *  - Request logging to stdout: timestamp, method, URL, status, duration.
 *  - GET /api/v1/health -> 200 {"status":"ok"}
 *  - POST /api/v1/calculate -> binary arithmetic over a JSON body
 *      { "operation": "add" | "subtract" | "multiply" | "divide",
 *        "a": <finite number>, "b": <finite number> }
 *    Responds 200 {"operation","a","b","result"} on success, or 400
 *    {"error": "..."} when the body is malformed or fails validation
 *    (contract documented in docs/adr/0002-calculate-endpoint.md).
 *
 * Run it directly:
 *   node server.js                 # http://127.0.0.1:3000
 *   PORT=8080 HOST=0.0.0.0 node server.js
 *
 * Use it as a library (see test/health.test.js and test/calculate.test.js):
 *   import { createApp, startServer } from "./server.js";
 *
 * Only Node built-ins are used — no dependencies.
 */
import http from "node:http";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const DEFAULT_HOST = process.env.HOST || "127.0.0.1";

/**
 * Binary arithmetic supported by POST /api/v1/calculate. Each key is the
 * `operation` string a client may send; each value computes the result from
 * the two validated numeric operands.
 */
const OPERATIONS = Object.freeze({
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b,
});

/** Cap on request body size so a single connection cannot exhaust memory. */
const MAX_REQUEST_BODY_BYTES = 1024 * 1024; // 1 MiB

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

/** Permissive CORS headers applied to every response. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

/**
 * Create a configured HTTP server. Nothing is started until you call
 * `server.listen(...)`, which lets tests bind an ephemeral port.
 *
 * @param {string} [rootDir] directory served as the site root (defaults to
 *   the directory containing this file)
 * @returns {import("node:http").Server}
 */
export function createApp(rootDir = __dirname) {
  const root = path.resolve(rootDir);

  const server = http.createServer((req, res) => {
    handleRequest(req, res, root).catch((err) => {
      console.error("[server] unhandled request error:", err);
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Internal Server Error" });
      } else {
        res.destroy();
      }
    });
  });

  return server;
}

/**
 * Start the server on the given port/host. Returns the listening server so
 * callers can stop it again (useful from tests).
 */
export function startServer(options = {}) {
  const {
    port = DEFAULT_PORT,
    host = DEFAULT_HOST,
    rootDir = __dirname,
  } = options;
  const server = createApp(rootDir);
  server.listen(port, host, () => {
    const actualPort = server.address().port;
    console.log(
      `[server] listening on http://${host}:${actualPort} (serving ${path.resolve(
        rootDir
      )})`
    );
  });
  return server;
}

async function handleRequest(req, res, root) {
  applyCors(res);

  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${
        Date.now() - startedAt
      }ms`
    );
  });

  // Preflight: browsers ask before cross-origin requests.
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let url;
  try {
    url = new URL(req.url || "/", "http://localhost");
  } catch {
    sendJson(res, 400, { error: "Bad Request" });
    return;
  }

  // JSON calculation API (POST). Everything else below is read-only
  // static file serving, so it keeps the GET/HEAD gate.
  if (url.pathname === "/api/v1/calculate") {
    await handleCalculate(req, res);
    return;
  }

  // A static file server only serves reads.
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }
  const headOnly = req.method === "HEAD";

  // Health check endpoint.
  if (url.pathname === "/api/v1/health") {
    sendJson(res, 200, { status: "ok" }, headOnly);
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendJson(res, 400, { error: "Bad Request" }, headOnly);
    return;
  }

  await serveStaticFile(res, root, pathname, headOnly);
}

/**
 * POST /api/v1/calculate — perform a single binary arithmetic operation.
 *
 * Request body (JSON): { operation, a, b }
 *   operation: "add" | "subtract" | "multiply" | "divide"
 *   a, b:      finite JSON numbers
 *
 * Response:
 *   200 { operation, a, b, result } on success
 *   400 { error: "<message>" }      on malformed body or invalid input
 *   405 { error: "Method Not Allowed" } when the method is not POST
 *   413 { error: "Payload Too Large" } when the body exceeds 1 MiB
 */
async function handleCalculate(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  let bodyText;
  try {
    bodyText = await readRequestBody(req);
  } catch (err) {
    if (err && err.code === "REQUEST_BODY_TOO_LARGE") {
      sendJson(res, 413, { error: "Payload Too Large" });
      return;
    }
    // Broken/incomplete request body: treat as not valid JSON.
    sendJson(res, 400, { error: "Request body must be valid JSON" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    sendJson(res, 400, { error: "Request body must be valid JSON" });
    return;
  }

  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    sendJson(res, 400, { error: "Request body must be a JSON object" });
    return;
  }

  const problem = validateCalculate(payload);
  if (problem) {
    sendJson(res, 400, { error: problem });
    return;
  }

  const { operation, a, b } = payload;
  const result = OPERATIONS[operation](a, b);

  // Operands are finite, but arithmetic can still overflow to Infinity
  // (e.g. 1e308 + 1e308). JSON.stringify would turn that into null, so
  // surface it as a validation error instead.
  if (!Number.isFinite(result)) {
    sendJson(res, 400, { error: "Result is not a finite number" });
    return;
  }

  sendJson(res, 200, { operation, a, b, result });
}

/**
 * Validate a parsed calculate payload. Returns an error message when the
 * payload cannot be computed, or null when it is valid.
 *
 * Checks run in order: presence of operation/a/b, numeric type of a/b,
 * finiteness of a/b, supported operation, and finally division by zero.
 *
 * @param {{ operation: unknown, a: unknown, b: unknown }} payload
 * @returns {string | null}
 */
function validateCalculate({ operation, a, b }) {
  if (operation === undefined) return "Missing required field: operation";
  if (a === undefined) return "Missing required field: a";
  if (b === undefined) return "Missing required field: b";

  if (typeof a !== "number") return "a must be a number";
  if (typeof b !== "number") return "b must be a number";

  if (!Number.isFinite(a)) return "a must be a finite number";
  if (!Number.isFinite(b)) return "b must be a finite number";

  if (!Object.hasOwn(OPERATIONS, operation)) {
    return `Unsupported operation: ${operation}`;
  }

  // 1 / 0 would be Infinity in JS; reject it explicitly. -0 is equal to 0,
  // so dividing by -0 is rejected here as well.
  if (operation === "divide" && b === 0) {
    return "Division by zero";
  }

  return null;
}

/**
 * Read a request body as UTF-8 text, capped at `limit` bytes. Rejects with an
 * error carrying code "REQUEST_BODY_TOO_LARGE" when the cap is exceeded.
 *
 * @returns {Promise<string>}
 */
function readRequestBody(req, limit = MAX_REQUEST_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        return; // keep draining the socket, but stop buffering
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        const err = new Error("Request body exceeds the size limit");
        err.code = "REQUEST_BODY_TOO_LARGE";
        reject(err);
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

async function serveStaticFile(res, root, pathname, headOnly) {
  // Resolve against the root and reject anything that escapes it.
  const filePath = path.resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    sendJson(res, 403, { error: "Forbidden" }, headOnly);
    return;
  }
  // Refuse hidden files (".git", ".env", ...) and encoded traversal segments.
  for (const segment of pathname.split("/")) {
    if (segment.startsWith(".")) {
      sendJson(res, 403, { error: "Forbidden" }, headOnly);
      return;
    }
  }

  // Directories serve their index.html (so "/" -> "index.html").
  let target = filePath;
  try {
    const stats = await fs.stat(target);
    if (stats.isDirectory()) {
      target = path.join(target, "index.html");
    }
  } catch {
    sendJson(res, 404, { error: "Not Found" }, headOnly);
    return;
  }

  let body;
  try {
    body = await fs.readFile(target);
  } catch (err) {
    if (err.code === "ENOENT") {
      sendJson(res, 404, { error: "Not Found" }, headOnly);
      return;
    }
    console.error(`[server] failed to read ${target}:`, err);
    sendJson(res, 500, { error: "Internal Server Error" }, headOnly);
    return;
  }

  const extension = path.extname(target).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "no-cache",
  });
  res.end(headOnly ? undefined : body);
}

function applyCors(res) {
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(name, value);
  }
}

function sendJson(res, statusCode, payload, headOnly = false) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(headOnly ? undefined : body);
}

// Run directly with `node server.js` (no-op when imported).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  startServer();
}
