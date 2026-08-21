# Project Brief

## What & why
A modular, extensible scientific calculator built in plain JavaScript as an assessment project. It solves the problem of evaluating complex arithmetic and scientific expressions entirely in the browser while demonstrating object-oriented design and loose coupling for maintainability, extensibility, and testability.

## Key features
- Basic arithmetic: addition, subtraction, multiplication, division, modulus
- Scientific functions: trigonometric (sin, cos, tan), logarithmic (log, ln), square root, power, factorial
- Constants: π (PI) and e (Euler's number)
- Parentheses support for nested/complex expressions
- Unary operators: negation, reciprocal, toggle sign
- Persistent calculation history via `localStorage` (save, clear, reuse previous expressions)
- Full keyboard support for input and actions
- Light/dark theme toggle
- Graceful error handling for invalid input, math errors, and malformed expressions
- Extensible operator/function registry

## Tech stack
- Vanilla JavaScript with ES modules — no build step or server required
- HTML and CSS (`styles/style.css`), single-page browser app
- Custom in-browser test runner (`src/test/testRunner.js`)
- Runs entirely client-side; published as a GitHub Pages live demo

## Architecture at a glance
Processing pipeline: `[User Input] → [Tokenizer] → [Parser → RPN] → [Evaluator] → [Controller] → [UI]`

- `src/calculator/tokenizer.js` — converts the input string into tokens (numbers, operators, functions, constants, brackets)
- `src/calculator/parser.js` — converts the token stream to Reverse Polish Notation (RPN) using the shunting-yard algorithm; validates structure and precedence
- `src/calculator/evaluator.js` — computes the result from RPN tokens using a stack-based approach
- `src/calculator/operations.js` — central registries (`operators`, `functions` Maps); the extension point for new operations
- `src/calculator/calculator.js` — orchestrates tokenize → parse → evaluate
- `src/calculator/history.js` — localStorage-backed calculation history
- `src/UI/calculatorController.js` — binds UI events, keyboard shortcuts, and display updates to the calculator
- `src/utils/stack.js`, `src/utils/utils.js` — shared helper utilities
- `src/main.js` — application entry point
- `src/test/*` — unit tests for calculator, parser, evaluator, operators, stack, and controller

## Conventions
- No build step or server: open `index.html` in a browser
- Object-oriented modules with loose coupling; each stage (tokenize/parse/evaluate) has a single responsibility
- To run tests: uncomment `<script src="src/test/testRunner.js" type="module" defer></script>` in `index.html`, then uncomment the desired `await import("./*.js")` lines inside `src/test/testRunner.js`; results print to the browser console
- To add an operator/function: add an entry to the `operators` or `functions` Map in `src/calculator/operations.js` with `lexerString`, `tokenString`, `precedence`, `associativity`, `arity`, and `execute`

## Pointers
- `README.md` — overview, system workflow, run/test instructions, and extension guide
- `index.html` — app entry; uncomment the test-runner script to run tests
- `src/main.js` — bootstrap/entry point
- `src/calculator/operations.js` — start here to add or modify operators/functions
- `src/calculator/parser.js` and `src/calculator/evaluator.js` — core of the evaluation pipeline
- `src/test/testRunner.js` — test orchestration
- Live demo: https://jaimin-dekavadiya-simform.github.io/assessment_calculator/