# Scientific Calculator — Docker

This document is the technical reference for the containerised deployment of the Scientific Calculator. It records **what changed**, **why it changed**, and **what someone needs to know to use it**. For the one-command quick start, see the [Run with Docker](../README.md#run-with-docker) section of the README; for the calculator internals, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

Scope: the containerisation work only — `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and the README "Run with Docker" section. No calculator source code was changed by this work.

---

## Table of contents

1. [What changed & why](#1-what-changed--why)
2. [Files](#2-files)
3. [Image contents](#3-image-contents)
4. [Usage](#4-usage)
5. [Health & lifecycle](#5-health--lifecycle)
6. [Verified behaviour](#6-verified-behaviour)
7. [Limitations & observations](#7-limitations--observations)

---

## 1. What changed & why

### What changed

| Change | File | Kind |
| --- | --- | --- |
| Static nginx server image | `Dockerfile` | added |
| Single-service Compose definition | `docker-compose.yml` | added |
| Build-context exclusions | `.dockerignore` | added |
| "Run with Docker" quick start | `README.md` | modified |

No application code changed. The container is a deployment wrapper that serves the existing static files.

### Why

The app is a browser-only ES-module application (`<script src="src/main.js" type="module">` in `index.html`). Module scripts are fetched with CORS, so opening `index.html` directly over `file://` fails in most browsers — the module requests come from an opaque origin and are blocked. A static HTTP server is therefore required to run the app locally.

Docker supplies that server (nginx) in a reproducible way:

- **No build step** — the container serves the exact static files the browser needs, unchanged.
- **Portable** — the only prerequisite is Docker (with Docker Compose); no local nginx or Node installation.
- **Reproducible** — the image is built from the repository alone and serves a fixed, documented set of files (see [§3](#3-image-contents)).

---

## 2. Files

### 2.1 `Dockerfile`

```dockerfile
FROM nginx:1.30-alpine

# Serve the static app from nginx's default document root.
COPY index.html /usr/share/nginx/html/
COPY styles/ /usr/share/nginx/html/styles/
COPY src/ /usr/share/nginx/html/src/

EXPOSE 80

HEALTHCHECK --interval=10s --start-period=5s --timeout=3s --retries=3 CMD wget -q --spider http://localhost/ || exit 1
```

| Directive | Purpose |
| --- | --- |
| `FROM nginx:1.30-alpine` | Base image (resolves to nginx/1.30.4 at build time). Serves `/usr/share/nginx/html` on port 80 with the default nginx config. |
| `COPY index.html …` | Copies the app entry point into the document root. |
| `COPY styles/ …` | Copies the stylesheet directory. |
| `COPY src/ …` | Copies the application modules (calculator, UI, utils). |
| `EXPOSE 80` | Documents that the container listens on port `80/tcp` (the port the Compose file publishes). |
| `HEALTHCHECK` | Marks the container healthy when `GET /` responds (`wget --spider`), probed every 10s with a 5s start grace, 3s timeout, and 3 retries. |

There is no custom nginx configuration and no runtime environment variables. The nginx master process runs as root to bind port 80 (official nginx model); the worker processes run as `nginx`. The container is stateless: calculation history lives in the browser's `localStorage`, not in the container.

### 2.2 `docker-compose.yml`

```yaml
services:
  calculator:
    build: .
    image: scientific-calculator:latest
    ports:
      - "8080:80"
```

| Key | Value | Purpose |
| --- | --- | --- |
| `services.calculator` | — | Single service; no restart policy or `container_name` by design. |
| `build` | `.` | Builds the image from the repository root using `Dockerfile`. |
| `image` | `scientific-calculator:latest` | Names/tags the built image. |
| `ports` | `"8080:80"` | Maps host port 8080 to the container's nginx port 80. |

### 2.3 `.dockerignore`

```text
.git
.ai-sdlc
.vscode
docs/
README.md
src/test/
assets/
```

| Excluded path | Why it is excluded from the build context |
| --- | --- |
| `.git` | Version-control history is not needed at runtime. |
| `.ai-sdlc` | Scaffolding metadata is not needed at runtime. |
| `.vscode` | Editor settings are not needed at runtime. |
| `docs/` | Documentation is not served by the app. |
| `README.md` | Documentation is not served by the app. |
| `src/test/` | Test files are not served at runtime; nginx:alpine has no Node runtime to execute them. |
| `assets/` | Screenshots used only by the README; the app itself does not load them (the favicon is an external URL). |

The image only contains what the `COPY` directives bring in, so `CONTEXT.md`, `Dockerfile`, and `docker-compose.yml` are in the build context but are not copied into the image.

---

## 3. Image contents

The built image contains exactly 12 served files, all copied from the repository and byte-identical to it:

| Path | Served as |
| --- | --- |
| `index.html` | the app entry page (`text/html`) |
| `styles/style.css` | all styling and theming (`text/css`) |
| `src/main.js` | application bootstrap (`application/javascript`) |
| `src/calculator/calculator.js` | pipeline orchestrator |
| `src/calculator/evaluator.js` | RPN evaluator |
| `src/calculator/history.js` | localStorage history |
| `src/calculator/operations.js` | operator/function/constant registries |
| `src/calculator/parser.js` | shunting-yard parser |
| `src/calculator/tokenizer.js` | expression tokenizer |
| `src/UI/calculatorController.js` | UI controller |
| `src/utils/stack.js` | LIFO stack |
| `src/utils/uitls.js` | `isDigit` / `factorial` helpers |

The `.js` modules are served with the `application/javascript` MIME type required for ES modules.

Excluded from the image (by `.dockerignore` or because they are not copied): `.git`, `.ai-sdlc`, `.vscode`, `docs/`, `README.md`, `CONTEXT.md`, `Dockerfile`, `docker-compose.yml`, `src/test/`, and `assets/`.

---

## 4. Usage

**Prerequisites:** Docker with Docker Compose installed.

### 4.1 Option 1 — Docker Compose

```bash
docker compose up --build
```

Then open <http://localhost:8080>.

Stop the container with `Ctrl+C`, and remove it with:

```bash
docker compose down
```

### 4.2 Option 2 — Docker CLI

```bash
docker build -t scientific-calculator:latest .
docker run -p 8080:80 scientific-calculator:latest
```

Then open <http://localhost:8080>.

### 4.3 Verify

```bash
docker compose config       # validate the Compose file
docker compose ps           # show container status (health)
docker ps                   # equivalent status via Docker CLI
```

A healthy, working deployment returns `200` for `/`, `/index.html`, `/src/main.js`, and `/styles/style.css`, and the calculator evaluates expressions in the browser.

---

## 5. Health & lifecycle

- The `HEALTHCHECK` probes `http://localhost/` with busybox `wget --spider`, every 10 seconds (`--interval=10s`) with a 5-second start grace (`--start-period=5s`), a 3-second timeout (`--timeout=3s`), and 3 retries (`--retries=3`).
- A freshly started container first reports `healthy` after the 5-second start period has elapsed (verified in §6); there is no longer a ~30-second `starting` window.
- `docker compose down` removes the container and network. The app defines no volumes or environment variables, so teardown leaves no orphaned containers, networks, or volumes.

---

## 6. Verified behaviour

The following was verified against the built image (clean `--no-cache` build):

| Check | Result |
| --- | --- |
| Build | Succeeded with no errors or warnings; image `scientific-calculator:latest` is ~92.8 MB (`docker images`). |
| Startup | Container starts with no errors or restarts and reaches `healthy` after the 5-second start period. |
| Served files | `/`, `/index.html`, `/src/main.js`, `/styles/style.css` all return `200` with correct MIME types. |
| File integrity | All 12 served files are byte-identical to the repository. |
| End-to-end (headless Chrome) | `1 + 2` → `3`; `5!` → `120`; `1 / 0` → `"Math Error"` with no uncaught exception. |
| Reproducibility | `docker compose down`, rebuild, and rerun reach the same healthy, serving state; plain `docker run` also works. |

---

## 7. Limitations & observations

These are non-blocking observations, not defects.

1. **LOW** — The base image is pinned by minor tag (`nginx:1.30-alpine`) rather than a content digest; a digest pin would give stricter reproducibility.
2. **INFO** — `src/test/` is intentionally excluded from the image, so the project's in-browser console test suite cannot run inside the container (`nginx:alpine` has no Node runtime). The test suite remains browser/console-only, per the project's own runner, and has pre-existing failures unrelated to the Docker change.
