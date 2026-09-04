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
 *
 * Run it directly:
 *   node server.js                 # http://127.0.0.1:3000
 *   PORT=8080 HOST=0.0.0.0 node server.js
 *
 * Use it as a library (see test/health.test.js):
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

  // A static file server only serves reads.
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }
  const headOnly = req.method === "HEAD";

  let url;
  try {
    url = new URL(req.url || "/", "http://localhost");
  } catch {
    sendJson(res, 400, { error: "Bad Request" }, headOnly);
    return;
  }

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
