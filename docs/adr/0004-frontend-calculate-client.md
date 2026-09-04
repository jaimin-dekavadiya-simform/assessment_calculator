# ADR 0004: Frontend arithmetic client for POST /api/v1/calculate

## Status

Accepted

## Context

ADR 0002 added `POST /api/v1/calculate`, a binary arithmetic JSON API
(`add`/`subtract`/`multiply`/`divide` over two finite operands), and the app
has always evaluated every expression locally in the browser via the
`Tokenizer → Parser → Evaluator` pipeline. This ADR covers wiring the UI
controller (`src/UI/calculatorController.js`) to that API so plain two-operand
arithmetic is computed by the server instead of on the device.

Constraints:

- The controller must keep its existing display and history behavior
  (same result formatting, same history entries, same error UX).
- The API only supports a single binary operation between two numbers;
  full expressions (functions, parentheses, chained operators, modulus,
  unary handling) are out of scope for `/api/v1/calculate`.
- The app can still be opened directly from disk without a server
  (ADR 0001 consequence); regressions there must be avoided.
- The project has no build step and no frontend dependency management; the
  new module must be a plain ES module consistent with the existing `src/`.

## Decision

1. **New module `src/UI/apiClient.js`** exports `requestCalculation(operation,
   a, b)` (plus the same function as the default export). It `POST`s JSON
   `{ operation, a, b }` to `/api/v1/calculate` with `Content-Type:
   application/json`, then parses the response:
   - HTTP 2xx with a JSON body carrying a numeric `result` → resolves with
     that number.
   - Any other HTTP status → rejects with an `Error` whose `message` is the
     server's `{"error": "<message>"}` string when present (e.g. `Division by
     zero`), else a descriptive `Calculation request failed (HTTP <status>)`.
   - Non-JSON body → rejects with a descriptive message.
   - `fetch()` itself rejecting (server unreachable, offline, CORS failure) →
     rejects with `Unable to reach the calculation service`, keeping the
     original error as `cause` for debugging.

2. **Controller routing** in `#handleSubmit`: when the display content is a
   plain `a <op> b` expression with `<op>` one of `+ - * /` and both operands
   finite numbers (`#parseBasicArithmetic`), the controller calls
   `requestCalculation` instead of `this.calculator.calculate(str)`. Every
   other expression (functions, brackets, chained operators, `%`, `^`, ...)
   is still evaluated locally by the existing engine. The `allowSubmit`,
   display-update, history-push and history-panel behavior on success is
   shared between the two paths (`#finishCalculation`).

3. **Display parity rounding:** the local evaluator rounds every intermediate
   result with `Number(value.toFixed(15))` (`EVALUATE_PRECISION = 15` in
   `src/main.js`). The API returns raw IEEE-754 results with no rounding
   (ADR 0002), so `1/3` would otherwise display `0.3333333333333333` instead
   of the historical `0.333333333333333`. The controller therefore rounds a
   remote result with the same `toFixed(15)` conversion before storing,
   displaying and history-logging it.

4. **Offline/local fallback:** if the remote request fails for any reason
   (server not running, network error, API error such as division by zero),
   `#submitBasicArithmetic` re-runs the same expression through the local
   engine (`#evaluateLocally`). This reproduces the pre-ADR behavior exactly
   when the app is opened without a server, keeps division-by-zero showing
   `Math Error` as before, and never pushes a history entry for a failed
   calculation. A stale in-flight response is ignored if the user edited the
   display while the request was pending.

5. **Testing:** `test/frontendIntegration.test.js` mocks the global `fetch`
   (no real server/network) and verifies the request contract (URL, method,
   headers, JSON body) plus success resolution, server error-message parsing,
   non-JSON error bodies and network failure. It runs with the existing
   `node --test` suite.

## Consequences

- Basic arithmetic is computed server-side when the app is served by the
  Node server, while complex/scientific expressions continue to run locally
  and the offline file-open flow still works through the fallback.
- Results shown and stored in history for `a <op> b` expressions are
  numerically identical to local evaluation (15-decimal rounding preserved),
  so no user-visible behavior change occurs on success.
- `/api/v1/calculate` is deliberately not used for expressions it cannot
  represent; there is no attempt to serialize arbitrary expressions onto the
  binary endpoint.
- The client keeps a single responsibility: `apiClient.js` knows nothing
  about the DOM, and the controller knows nothing about HTTP details beyond
  the API operation names (`add`/`subtract`/`multiply`/`divide`).
