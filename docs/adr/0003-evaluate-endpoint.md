# ADR 0003: Safe expression evaluation API — POST /api/v1/evaluate

## Status

Accepted

## Context

ADR 0001 established a dependency-free Node HTTP server (static files, CORS,
`GET /api/v1/health`). ADR 0002 added `POST /api/v1/calculate`, a binary-only
arithmetic API. The next need is to let cross-origin consumers evaluate whole
arithmetic/scientific expressions (parentheses, precedence, unary minus,
functions, constants) — the same input the browser calculator accepts — without
reimplementing a parser and without ever using `eval()`.

The calculator's tokenizer/parser/evaluator pipeline lives in the browser
modules `src/calculator/tokenizer.js`, `src/calculator/parser.js`,
`src/calculator/evaluator.js`, `src/calculator/operations.js` and
`src/utils/stack.js`. These are plain ES modules with no DOM, `window` or
`localStorage` access, so they can be imported and executed unchanged under
Node (`package.json` already sets `"type": "module"`).

Constraints inherited from ADR 0001/0002:

- No external dependencies (no Express, no runtime npm packages).
- `server.js` must keep exporting `createApp(rootDir)` and
  `startServer({port, host, rootDir})`; tests boot per-test ephemeral servers.
- Everything else stays a read-only static server (only GET/HEAD) — the new
  POST route must not weaken that gate for other paths.
- Protocol-level failures keep the server's existing JSON/status conventions
  (400/405/413 with an `{"error": "<message>"}` body).

## Decision

1. **Endpoint:** `POST /api/v1/evaluate`. Any other method on that path gets
   `405 {"error":"Method Not Allowed"}` with an `Allow: POST` header; CORS
   preflight (`OPTIONS`) still returns 204 for every path. Bodies are read as
   UTF-8 up to the same 1 MiB cap as `/api/v1/calculate` (larger →
   `413 {"error":"Payload Too Large"}`).
2. **Request:** a JSON object body `{"expression": "<string>"}`. `expression`
   is any string the browser calculator could evaluate (numbers, `+ - * / % ^
   !`, parentheses, `sin/cos/tan/log/ln/√`, `π` and `e` constants, unary
   minus, implicit multiplication). Extra fields are ignored.
3. **Evaluation:** the expression is run through the app's own
   `Tokenizer → Parser (shunting-yard to RPN) → Evaluator (stack)` pipeline
   with the shared `operators`/`functions`/`constants` registries and the same
   15-decimal precision (`EVALUATE_PRECISION = 15`) the browser app wires in
   `src/main.js`. **`eval()` is never used.** The `Calculator` facade
   (`src/calculator/calculator.js`) is deliberately not reused because it logs
   every token stream to the console on each call; the route composes the same
   three classes directly in a small `evaluateExpression(str)` helper.
4. **Success:** `200 {"expression": ..., "result": ...}`. `expression` is
   echoed exactly as received (no trimming or rewriting); `result` is the
   numeric answer already rounded to 15 decimal places by the evaluator.
5. **Validation.** Two domain error codes are introduced, returned as
   `400 {"error": "<code>"}`:

   | Condition | Error |
   | --- | --- |
   | `expression` missing, or not a JSON string (number, boolean, null, array, object) | `INVALID_INPUT` |
   | `expression` is a string but the pipeline rejects it — tokenizer (unknown characters, empty string), parser (unbalanced brackets, missing operands, double operators), evaluator (division by zero, `log`/`ln` of ≤ 0, `√` of a negative, `tan` at poles, underflow) — or the result is not finite (e.g. `9^9^9` overflows to `Infinity`) | `INVALID_EXPRESSION` |

   The `INVALID_EXPRESSION` vs `INVALID_INPUT` split is deliberately the
   endpoint analogue of the UI's "Invalid Expression" vs "Invalid Input"
   classification in `src/UI/calculatorController.js`, but with one
   simplification: at the HTTP boundary `INVALID_INPUT` covers exactly the
   "not a string at all" case, while every failure of a *string* through the
   pipeline — lexical, structural or mathematical — is `INVALID_EXPRESSION`.
   Only two codes exist, so math-domain failures (e.g. division by zero) do
   not get their own code.

6. **Protocol failures are unchanged from ADR 0001/0002** and are not
   expression errors: body that is not valid JSON →
   `400 {"error":"Request body must be valid JSON"}`; valid JSON that is not a
   plain object (null, array, scalar) →
   `400 {"error":"Request body must be a JSON object"}`.
7. **Finiteness guard:** a syntactically valid expression can still overflow
   (`9^9^9`). `JSON.stringify` would silently serialize `Infinity` as `null`,
   so a non-finite result is answered with
   `400 {"error":"INVALID_EXPRESSION"}` instead, mirroring the
   "Result is not a finite number" guard in `/api/v1/calculate`.
8. **Implementation:** the `evaluate` route branch sits next to the
   `calculate` branch in `handleRequest`, before the static GET/HEAD gate.
   Calculator modules are imported once at the top of `server.js`; they are
   the browser's own source files and are never copied or forked.
9. **Testing:** `test/evaluate.test.js` mirrors the ephemeral-port harness of
   `test/health.test.js`/`test/calculate.test.js` and covers: verbatim
   expression echo; an operator-precedence matrix (`*` over `+`, parentheses,
   right-associative `^`, unary-minus vs `^`, left-associative `-`, `!`
   binding) cross-checked against `src/test/calculatorTest.js`; constants and
   functions with floating-point tolerance; a malformed/unevaluable-expression
   matrix (every case above returning `INVALID_EXPRESSION`); a
   non-string-expression matrix (`INVALID_INPUT`); malformed-JSON and
   non-object bodies; 405 with `Allow: POST`; and OPTIONS preflight. `npm test`
   (`node --test test/`) picks the new file up automatically.

## Consequences

- Cross-origin consumers get a dependency-free way to evaluate the full
  calculator language over HTTP, with results identical in rounding behaviour
  to the browser app (15 decimal places), because the exact same modules run.
- No `eval` and no new math code: the attack surface of the new endpoint is
  the existing, browser-tested tokenizer/parser/evaluator, and the server adds
  no new operator or function implementations to review.
- Errors stay simple: two coarse domain codes (`INVALID_INPUT`,
  `INVALID_EXPRESSION`) for expression problems, plus the existing
  human-readable protocol messages — a deliberate choice consistent with the
  assessment-server convention of not over-distinguishing failure classes.
- The server remains read-only for static files: only the two POST routes
  exist outside the GET/HEAD gate.
- Importing `src/**` in Node is safe today, but any future browser module that
  touches DOM/localStorage at import time would break `server.js` startup; the
  evaluate endpoint only imports `tokenizer/parser/evaluator/operations` and
  `utils/stack`, never `history.js` or UI code.
