# Scientific Calculator API

## Overview

This is the Express backend for the scientific calculator. It exposes the same
tokenize → parse → evaluate engine that powers the browser calculator as a
stateless HTTP API, so any client can submit a full mathematical expression and
receive a numeric result.

The browser calculator (`index.html`, `src/`) is unchanged. The engine under
`server/src/services/` is a CommonJS port of `src/calculator/` with the same
operator, function, and constant registries, the same shunting-yard parser, and
the same stack-based evaluator.

## Why this backend exists

The original project ran entirely in the browser and had no server. This
backend adds:

- A single full-expression endpoint, `POST /api/v1/calculate`.
- A health check (`GET /health`) for liveness probes.
- A machine-readable OpenAPI contract (`openapi.yaml`) plus interactive Swagger
  UI at `/docs`.
- Configurable CORS and environment-based configuration via `.env`.
- A clean layering (routes → middleware/controller → service → engine) so the
  HTTP concerns are kept separate from the calculation logic.

## Features

- **Basic arithmetic:** addition, subtraction, multiplication, division, modulus.
- **Scientific functions:** `sin`, `cos`, `tan`, `log` (base 10), `ln` (natural),
  square root (`√`), power (`^`), factorial (`!`).
- **Constants:** `π` (PI) and `e` (Euler's number).
- **Parentheses:** nested and complex expressions.
- **Unary operators:** negation and identity (`-3`, `+3`).
- **Precedence and associativity:** correct operator precedence and
  right-associative exponentiation.
- **Whitespace handling:** spaces, tabs, and newlines are ignored.
- **Floating-point cleanup:** results are rounded to suppress noise
  (`0.1 + 0.2` → `0.3`), and integral results are returned as JSON integers.
- **Stable error codes:** every failure returns a machine-readable
  `{ error: { code, message } }` body.
- **Statelessness:** a fresh tokenizer, parser, and evaluator are created per
  request; no shared mutable state.

## Requirements

- Node.js 18 or newer (the `dev` script uses `node --watch`).
- npm.

## Getting started

1. **Install dependencies:**

   ```bash
   cd server
   npm install
   ```

2. **Configure (optional):**

   ```bash
   cp .env.example .env
   ```

   See [Configuration](#configuration) for the available variables.

3. **Run the server:**

   ```bash
   # production-style start
   npm start

   # development start with auto-restart on changes
   npm run dev
   ```

   The server listens on `http://localhost:3000` by default.

4. **Smoke-check it:**

   ```bash
   curl http://localhost:3000/health
   # {"status":"ok"}

   curl -X POST http://localhost:3000/api/v1/calculate \
     -H "Content-Type: application/json" \
     -d '{"expression": "2 + 3 * 4"}'
   # {"expression":"2 + 3 * 4","result":14}
   ```

5. **Run the tests:**

   ```bash
   npm test
   ```

## Configuration

Configuration is read from environment variables (`.env` is loaded
automatically via `dotenv`).

| Variable       | Default       | Description                                                                  |
| -------------- | ------------- | ---------------------------------------------------------------------------- |
| `PORT`         | `3000`        | Port the server listens on.                                                  |
| `NODE_ENV`     | `development` | Environment name. Request logging is disabled when set to `test`.             |
| `CORS_ORIGIN`  | `*`           | Allowed origin(s). A comma-separated list is accepted; `*` means any origin.  |

## API reference

### `POST /api/v1/calculate`

Evaluates a mathematical expression.

**Request body** (JSON):

```json
{ "expression": "2 + 3 * 4" }
```

- `expression` is required, must be a string, may be at most 500 characters,
  and must not be blank or whitespace-only.
- Unknown body fields are ignored.

**Success response** (`200`):

```json
{ "expression": "2 + 3 * 4", "result": 14 }
```

- `expression` is the trimmed input string.
- `result` is the evaluated number; integral results are returned as JSON
  integers rather than floats.

**Error responses** (`400` / `500`):

```json
{ "error": { "code": "MATH_ERROR", "message": "Operator / : Divide by Zero not allowed" } }
```

See [Error handling](#error-handling) for the full set of codes.

### `GET /health`

Returns `200` with `{ "status": "ok" }`.

### `GET /docs`

Serves the interactive Swagger UI for the OpenAPI document.

### `GET /openapi.yaml`

Serves the raw OpenAPI 3.0 document as YAML.

## Expression grammar

### Operators

| Input     | Meaning                          | Arity | Example                  |
| --------- | -------------------------------- | ----- | ------------------------ |
| `+`       | Addition                         | 2     | `2 + 3` → `5`            |
| `-`       | Subtraction                      | 2     | `5 - 3` → `2`            |
| `*`       | Multiplication                   | 2     | `2 * 3` → `6`            |
| `/`       | Division (zero is rejected)      | 2     | `10 / 2` → `5`           |
| `%`       | Modulus (zero is rejected)       | 2     | `10 % 3` → `1`           |
| `^`       | Power (right-associative)        | 2     | `2 ^ 3 ^ 2` → `512`      |
| `-` (unary) | Negation                       | 1     | `-3` → `-3`              |
| `+` (unary) | Identity                       | 1     | `+3` → `3`               |
| `!`       | Factorial (non-negative integer) | 1     | `5!` → `120`             |

### Functions

| Function | Description                         | Example              |
| -------- | ----------------------------------- | -------------------- |
| `sin`    | Sine (radians)                      | `sin(π/6)` → `0.5`   |
| `cos`    | Cosine (radians)                    | `cos(π)` → `-1`      |
| `tan`    | Tangent (asymptotes are rejected)   | `tan(π/4)` → `1`     |
| `log`    | Base-10 logarithm (`≤ 0` rejected)  | `log(1000)` → `3`    |
| `ln`     | Natural logarithm (`≤ 0` rejected)  | `ln(e^2)` → `2`      |
| `√`      | Square root (negative is rejected)  | `√(16)` → `4`        |

### Constants

| Constant | Value        |
| -------- | ------------ |
| `π`      | `Math.PI`    |
| `e`      | `Math.E`     |

### Precedence and associativity

Lowest to highest:

1. `+` / `-`
2. `*` / `/` / `%`
3. unary `-` / unary `+`
4. `^` (right-associative)
5. functions
6. `!`

Parentheses override precedence as usual. Because `^` binds tighter than unary
minus, `-3^2` evaluates to `-(3^2)` = `-9`, while `(-3)^2` evaluates to `9`.

### Syntax notes

- Whitespace (spaces, tabs, newlines) is ignored.
- Functions may be written with or without parentheses: `sin(π/6)` and
  `sin π` are equivalent, and chains such as `sin cos π` and `ln √ 16` work.
- **Implicit multiplication is not allowed.** Use an explicit `*`:
  `2(3+4)`, `2π`, `(1+2)(3+4)`, and `2 3` are all rejected.

## Error handling

All error responses use the shape:

```json
{ "error": { "code": "<CODE>", "message": "<human-readable message>" } }
```

| Code                 | HTTP | Meaning                                                                                                  |
| -------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`   | 400  | The request body is invalid: missing, blank, non-string, or over-long expression, or malformed JSON.      |
| `INVALID_EXPRESSION` | 400  | The expression could not be tokenized or parsed (unknown token, unbalanced parentheses, malformed number, implicit multiplication). |
| `MATH_ERROR`         | 400  | The expression is mathematically undefined (division/modulo by zero, domain error, non-finite result).    |
| `INTERNAL_ERROR`     | 500  | An unexpected server error occurred.                                                                       |

Validation runs before evaluation, so a request that fails input validation
never reaches the calculation engine. Tokenizer/parser failures are reported as
`INVALID_EXPRESSION`; evaluator failures are reported as `MATH_ERROR`.

## Project structure

```
server/
│
├── openapi.yaml
├── package.json
├── .env.example
│
├── src/
│   ├── app.js                 # Express app: middleware, routes, error handler
│   ├── config.js              # Environment-based configuration
│   ├── server.js              # Entry point that starts the HTTP listener
│   │
│   ├── controllers/
│   │   └── calculateController.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validateExpression.js
│   ├── routes/
│   │   ├── calculateRoutes.js
│   │   └── docsRoutes.js
│   │
│   ├── services/
│   │   ├── calculatorService.js  # Pure service: primitives + calculate()
│   │   ├── tokenizer.js
│   │   ├── parser.js
│   │   ├── evaluator.js
│   │   ├── operations.js         # Single registry of operators/functions/constants
│   │   ├── stack.js
│   │   └── uitls.js
│   │
│   └── utils/
│       └── AppError.js        # Error with an HTTP status and stable code
│
└── test/
    ├── calculate.test.js       # HTTP seam (Supertest)
    ├── calculatorService.test.js
    ├── health.test.js
    └── docs.test.js
```

## Architecture

The request flows through four layers:

```
[HTTP request] → [routes] → [middleware] → [controller] → [service] → [engine]
```

- **Routes** map URLs to middleware and controllers.
- **Middleware** validates the `expression` field and maps any error to a stable
  response.
- **Controller** trims the expression, calls the service, and normalizes the
  numeric result for JSON.
- **Service** (`calculatorService.js`) exposes the eight math primitives
  (`add`, `subtract`, `multiply`, `divide`, `modulo`, `power`, `sqrt`,
  `factorial`) plus `calculate(expression)`, which orchestrates
  tokenizer → parser → evaluator and maps engine failures to `AppError`s.
- **Engine** (`tokenizer.js`, `parser.js`, `evaluator.js`, `operations.js`) is a
  CommonJS port of the browser calculator with no DOM, `localStorage`, or window
  dependencies.

`calculate()` is stateless: it constructs a new tokenizer, parser, and evaluator
on every call.

## Testing

Tests use Jest with Supertest for the HTTP seam.

```bash
npm test
```

- `calculate.test.js` exercises `POST /api/v1/calculate` across success,
  validation, invalid-expression, and math-error corpora.
- `calculatorService.test.js` tests the pure service primitives and the
  tokenize/parse/evaluate pipeline directly.
- `health.test.js` and `docs.test.js` cover the health check, the raw OpenAPI
  document, and the Swagger UI.

The suite runs with `NODE_ENV=test` so request logging is disabled during tests.

## Known limitations and differences from the browser calculator

- **Implicit multiplication is rejected here but accepted in the browser.**
  The browser calculator inserts a `*` for you (`2(3+4)` → `14`), while this API
  rejects it with `INVALID_EXPRESSION`. Keep to the documented grammar for
  consistent results across both surfaces.
- **Implicit-multiplication rejection is not exhaustive.** The tokenizer guards
  `NUMBER`/`CONSTANT`/`(` immediately following `NUMBER`/`CONSTANT`/`)`, but a
  value immediately followed by a function (e.g. `2 sin(π)`, `2√9`,
  `(1+2) sin(π)`) or a postfix `!` followed by a value (e.g. `5!3`) currently
  reaches the evaluator and returns `MATH_ERROR` rather than
  `INVALID_EXPRESSION`.
- **Empty function arguments are misclassified.** `sin()` returns `MATH_ERROR`
  rather than `INVALID_EXPRESSION`.
- **Request logging.** Morgan `dev`-format logging is enabled whenever
  `NODE_ENV` is not `test`, including production.
