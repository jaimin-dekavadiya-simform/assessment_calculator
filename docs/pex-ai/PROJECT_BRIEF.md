# Project Brief

## What & why
A modular, extensible scientific calculator built with vanilla JavaScript as a coding assessment. It demonstrates object-oriented design and loose coupling by separating input handling, parsing, evaluation, history, and UI concerns. The project solves the need for a browser-based calculator that handles both basic arithmetic and scientific operations while remaining easy to extend, maintain, and test without a build step.

## Key features
- **Basic arithmetic:** addition, subtraction, multiplication, division, modulus.
- **Scientific functions:** sin, cos, tan, log, ln, square root, power, factorial.
- **Constants:** π (PI) and e (Euler's number).
- **Parentheses support:** nested and complex expressions.
- **Unary operators:** negation, reciprocal, toggle sign.
- **Calculation history:** save, clear, or reuse prior expressions; persisted via `localStorage`.
- **Keyboard shortcuts:** full keyboard support for input and actions.
- **Theme toggle:** light/dark mode.
- **Error handling:** graceful messages for invalid input, math errors, and malformed expressions.
- **Extensibility:** operators/functions are registered in Maps, so they can be added or modified in one place.

## Tech stack
- **Language:** JavaScript (ES modules, `type="module"`).
- **Markup/Styling:** HTML and CSS (plain, no frameworks).
- **Persistence:** browser `localStorage` for history.
- **Build tooling:** none — runs directly in the browser; tests run in the browser console.

## Architecture at a glance
The system is a linear pipeline, with each stage in its own module under `src/`:

```
[User Input] → [Tokenizer] → [Parser (RPN)] → [Evaluator] → [Controller] → [UI]
```

- **`src/calculator/tokenizer.js`** — converts the input string into tokens (numbers, operators, functions, constants, brackets).
- **`src/calculator/parser.js`** — converts the token stream to Reverse Polish Notation (RPN) via the shunting-yard algorithm, validating structure and precedence.
- **`src/calculator/evaluator.js`** — computes the result from RPN tokens with a stack-based approach.
- **`src/calculator/operations.js`** — central registry of operators and functions (each entry defines `precedence`, `associativity`, `arity`, `execute`, etc.).
- **`src/calculator/history.js`** — saves, clears, and recalls evaluated expressions (persisted to `localStorage`).
- **`src/calculator/calculator.js`** — orchestrates the calculation engine.
- **`src/UI/calculatorController.js`** — wires the UI to the engine.
- **`src/utils/`** — shared `stack.js` and `utils.js`.
- **`src/test/`** — `testRunner.js` plus per-module test files (controller, calculator, evaluator, operator, parser, stack).
- **Entry points:** `index.html` / `main.js` / `styles/style.css`. Top-level module map lists `assets`, `src`, `styles`.

## Conventions
- **Run:** no build or server — open `index 1.html` directly in a browser (project structure also lists `index.html`).
- **Tests:** in `index 1.html`, uncomment the `<script src="src/test/testRunner.js">` tag; then in `src/test/testRunner.js`, uncomment the `await import("./*.js")` lines for the tests you want. Reload the page and read results in the browser console.
- **Extending the calculator:** edit `src/calculator/operations.js` and add an entry to the `operators` or `functions` Map, e.g., `operators.set("⊕", { lexerString: "⊕", tokenString: "xor", precedence: 1, associativity: "left", arity: 2, execute: (a, b) => a ^ b })`.
- **Code style:** object-oriented design, ES modules, loose coupling between layers; file naming is clean and module-scoped.

## Pointers
- **README.md** — primary reference (features, workflow, run/test steps, extension guide).
- **`index 1.html`** — app entry point and test-runner hook.
- **`src/test/testRunner.js`** — how to enable and run the test suite.
- **`src/calculator/operations.js`** — the registry to edit when adding operators/functions.
- **Project structure** (in README) and the top-level module map (`assets`, `src`, `styles`) for orientation.

No secondary repositories were listed for this project.