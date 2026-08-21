# Scientific Calculator — Architecture

This document is a self-contained technical reference for the Scientific Calculator codebase. It describes the application **as it actually behaves**, including discrepancies between the documentation and the code (see [ADR-0001](adr/0001-document-actual-behaviour.md)). For the user-facing feature overview, run instructions, and extension quick-start, see [`README.md`](../README.md). For the domain vocabulary (expression, token, RPN, registry, etc.), see [`CONTEXT.md`](../CONTEXT.md).

Scope: the whole application — the processing pipeline, the UI controller, utilities, `index.html`, the test suite and how to run it, the styles/theme system, and the assets. The `.ai-sdlc/` and `docs/ai-sdlc/` scaffolding directories are intentionally out of scope.

---

## Table of contents

1. [Overview & purpose](#1-overview--purpose)
2. [Entry points & module graph](#2-entry-points--module-graph)
3. [Processing pipeline](#3-processing-pipeline)
4. [Worked traces](#4-worked-traces)
5. [Module API reference](#5-module-api-reference)
6. [UI behaviours](#6-ui-behaviours)
7. [Tests](#7-tests)
8. [Styles & assets](#8-styles--assets)
9. [Observed behaviours, quirks & discrepancies](#9-observed-behaviours-quirks--discrepancies)
10. [Suggested follow-ups (not applied)](#10-suggested-follow-ups-not-applied)

---

## 1. Overview & purpose

The calculator evaluates arithmetic and scientific expressions entirely in the browser using plain JavaScript ES modules — no build step and no server. It is structured as a loose pipeline of single-responsibility classes, connected through constructor injection:

```
[User Input]  →  [Tokenizer]  →  [Parser → RPN]  →  [Evaluator]  →  [Controller]  →  [UI]
```

The design goals are object-oriented separation of concerns, loose coupling between stages, and extensibility through central registries (`operators`, `functions`, `constants` Maps). Each stage can be tested in isolation, and the whole pipeline is orchestrated by one `Calculator` class.

Two audiences are served:

- **Assessor** — this document makes the OOP structure, dependency flow, and extension points explicit without needing to re-read the source.
- **Future maintainer** — every module is referenced by path and export, with constructor signatures, public methods, token shapes, registry entry fields, and complete operator/function/constant tables.

Truthfulness policy: the code is the source of truth. Where the README or project brief disagrees with the code, the disagreement is recorded in [§9](#9-observed-behaviours-quirks--discrepancies) rather than silently reconciled.

---

## 2. Entry points & module graph

### 2.1 `index.html`

The single-page app entry point loads two resources:

```html
<link rel="stylesheet" href="styles/style.css" />
<script src="src/main.js" type="module" defer></script>
<!-- <script src="src/test/testRunner.js" type="module" defer></script> -->
```

- `styles/style.css` — all styling and theming.
- `src/main.js` — the application bootstrap module.
- The test-runner script is present but **commented out** by default; uncommenting it activates the in-browser test suite (see [§7](#7-tests)).

The body contains the calculator button grid, two display areas (`#historyDisplay`, `#currentDisplay`), the history panel (`#historyList`, `#clearHistoryBtn`), and a theme toggle (`#themeBtn`). Buttons carry `data-*` attributes (`data-number`, `data-operator`, `data-function`, `data-bracket`, `data-action`) that the controller reads.

### 2.2 Module graph

```
index.html
│
├── styles/style.css
│
├── src/main.js  (module entry point)
│   │
│   ├── UI/calculatorController.js
│   │       └── utils/uitls.js            (isDigit)
│   │
│   ├── calculator/calculator.js          (orchestrator; no imports)
│   ├── calculator/evaluator.js           (no imports)
│   ├── calculator/parser.js              (no imports)
│   ├── calculator/tokenizer.js           (no imports)
│   ├── calculator/operations.js
│   │       └── utils/uitls.js            (factorial)
│   ├── calculator/history.js             (no imports)
│   └── utils/stack.js                    (no imports)
│
└── src/test/testRunner.js  (optional, commented out)
        ├── stackTest.js
        ├── operatorTest.js
        ├── evaluatorTest.js
        ├── parserTest.js
        ├── tokenizerTest.js
        ├── calculatorTest.js
        └── calculatorControllerTest.js
```

### 2.3 Runtime wiring (`src/main.js`)

`main.js` is responsible only for composition — constructing the pipeline and handing it to the controller:

```js
const calculator = new Calculator(
  Evaluator, Parser, Tokenizer, Stack,
  operators, functions, constants,
  15,          // precision (decimal places)
);

const view = document.getElementsByClassName("container")[0];

const calculatorController = new CalculatorController(
  Stack, History, calculator, view,
);
```

Notable wiring decisions:

- **Classes, not instances** — `Calculator` receives the `Evaluator`, `Parser`, `Tokenizer`, and `Stack` *classes* and instantiates fresh instances inside `calculate()` (see [§5.5](#55-calculatorjs)).
- **Shared registries** — the same `operators`, `functions`, and `constants` Maps are passed to the tokenizer, parser, and evaluator, which is the single extension point for new operations.
- **Precision 15** — the rounding precision is fixed at 15 decimal places at the composition root.
- **History key** — the controller instantiates its own `History` with key `"calc-1"` (see [§5.6](#56-historyjs) and [§9](#9-observed-behaviours-quirks--discrepancies)).

---

## 3. Processing pipeline

The full data flow from a DOM event to a rendered result:

```
DOM event (click on button grid, or document keydown)
        │
        ▼
CalculatorController
  #handleClick / #handleKeyDown
        │  builds a { number | operator | function | bracket | action } data object
        ▼
  #handleInput
        │  appends to the display string (or invokes an action)
        ▼
  #handleSubmit
        │  reads this.display.innerHTML
        ▼
Calculator.calculate(str)
        │
        ├─ 1. Tokenizer.tokenize(str)   → infix token[]   (NUMBER/OPERATOR/BRACKET/FUNCTION/CONSTANT)
        ├─ 2. Parser.parse(tokens)      → RPN token[]     (shunting-yard)
        └─ 3. Evaluator.evaluate(rpn)   → number          (stack machine)
        ▼
CalculatorController
        │  success → update display, lastAnswer, historyDisplay, history.push()
        │  error   → map thrown message prefix to a user-facing message, set this.error
        ▼
UI (current-display / history-display / history-list)
```

Each stage has one responsibility and is independent of the others:

| Stage | Class | Input | Output |
| --- | --- | --- | --- |
| Tokenize | `Tokenizer` | expression string | ordered `{ type, value }` token array |
| Parse | `Parser` | token array | RPN token array (operators/functions follow operands) |
| Evaluate | `Evaluator` | RPN token array | single numeric result |
| Orchestrate | `Calculator` | expression string | numeric result |
| Present | `CalculatorController` | DOM events | display + history updates |

---

## 4. Worked traces

These traces use the actual tokenizer, parser, and evaluator output. Token arrays are shown as `TYPE(value)`; RPN is shown both with types and as the value sequence.

### 4.1 `3 + 4 * 2`

**Tokenize**

| Input fragment | Token produced |
| --- | --- |
| `3` | `NUMBER(3)` |
| `+` | `OPERATOR(+)` |
| `4` | `NUMBER(4)` |
| `*` | `OPERATOR(*)` |
| `2` | `NUMBER(2)` |

Whitespace is skipped. `+` and `*` are classified as binary operators because the previous token is a number.

**Parse → RPN**

Parser walks the tokens with an output queue and an operator stack:

| Step | Token | Output | Operator stack |
| --- | --- | --- | --- |
| 1 | `NUMBER(3)` | `3` | `[]` |
| 2 | `OPERATOR(+)` | `3` | `[+]` |
| 3 | `NUMBER(4)` | `3 4` | `[+]` |
| 4 | `OPERATOR(*)` | `3 4` | `[+, *]` (prec 1 < prec 2, no pop) |
| 5 | `NUMBER(2)` | `3 4 2` | `[+, *]` |
| end | flush stack | `3 4 2 * +` | `[]` |

RPN: `3 4 2 * +`

**Evaluate**

| Step | Token | Stack |
| --- | --- | --- |
| 1 | `3` | `[3]` |
| 2 | `4` | `[3, 4]` |
| 3 | `2` | `[3, 4, 2]` |
| 4 | `*` (arity 2) | pop 2, pop 4 → push `8` → `[3, 8]` |
| 5 | `+` (arity 2) | pop 8, pop 3 → push `11` → `[11]` |

Result: `11`.

### 4.2 `sin(π/6)`

**Tokenize**

The tokenizer both reads the explicit parentheses **and** auto-inserts brackets around function arguments. This produces a doubled `(` after `sin` and an early `)` after `π`:

| # | Token produced | Origin |
| --- | --- | --- |
| 1 | `FUNCTION(sin)` | `#readFunction` matches `sin` |
| 2 | `BRACKET(()` | auto-inserted by `#implicitAfter` |
| 3 | `BRACKET(()` | explicit `(` in the input |
| 4 | `CONSTANT(PI)` | `#readConstant` matches `π` |
| 5 | `BRACKET())` | auto-inserted flush of the function argument |
| 6 | `OPERATOR(/)` | `#readOperator` |
| 7 | `NUMBER(6)` | `#readNumber` |
| 8 | `BRACKET())` | explicit `)` in the input |

The doubled bracket is a real observed behaviour (see [§9](#9-observed-behaviours-quirks--discrepancies)). Despite it, the parser still produces the mathematically correct RPN for this expression.

**Parse → RPN**

| Step | Token | Output | Stack |
| --- | --- | --- | --- |
| 1 | `FUNCTION(sin)` | — | `[sin]` |
| 2 | `BRACKET(()` | — | `[sin, (]` |
| 3 | `BRACKET(()` | — | `[sin, (, (]` |
| 4 | `CONSTANT(PI)` | `PI` | `[sin, (, (]` |
| 5 | `BRACKET())` | `PI` | `[sin, (]` (pops matching `(`) |
| 6 | `OPERATOR(/)` | `PI` | `[sin, (, /]` |
| 7 | `NUMBER(6)` | `PI 6` | `[sin, (, /]` |
| 8 | `BRACKET())` | `PI 6 /` | `[sin]` (pops `/`, then `(`) |
| end | flush stack | `PI 6 / sin` | `[]` |

RPN: `PI 6 / sin` (i.e. `π 6 / sin`).

**Evaluate**

| Step | Token | Stack |
| --- | --- | --- |
| 1 | `PI` | `[3.141592653589793]` (Math.PI, `toFixed(15)`) |
| 2 | `6` | `[3.141592653589793, 6]` |
| 3 | `/` | push `3.141592653589793 / 6` = `0.523598775598299` |
| 4 | `sin` | `Math.sin(0.523598775598299)` = `0.5000000000000001` → `toFixed(15)` → `0.5` |

Result: `0.5`.

---

## 5. Module API reference

### 5.1 `src/calculator/operations.js`

**Exports:** `operators`, `functions`, `constants` (three `Map`s).

**Imports:** `factorial` from `../utils/uitls.js`.

This is the central registry — the single place to add, remove, or modify operations. The tokenizer, parser, and evaluator all receive these Maps and derive their behaviour from them.

#### Registry entry fields

**Operator entries** (`operators` Map):

| Field | Meaning |
| --- | --- |
| `lexerString` | exact characters matched in user input (e.g. `"π"`, `"√"`, `"-"`) |
| `tokenString` | normalized internal token name used by parser/evaluator (e.g. `"NEG"`) |
| `precedence` | numeric binding priority (higher binds tighter) |
| `associativity` | `"left"` or `"right"` (binary operators only) |
| `arity` | operand count (1 or 2) |
| `execute` | function performing the operation |
| `allowAtFront` | optional; present only on `NEG`/`PLUS` and never read anywhere (see [§9](#9-observed-behaviours-quirks--discrepancies)) |

**Function entries** (`functions` Map):

| Field | Meaning |
| --- | --- |
| `lexerString` | exact characters matched in user input (e.g. `"√"`) |
| `tokenString` | normalized internal token name (e.g. `"sqr-root"`) |
| `precedence` | numeric binding priority |
| `arity` | operand count (all current functions are arity 1) |
| `execute` | function performing the operation |

Functions have **no `associativity`** field.

**Constant entries** (`constants` Map):

| Field | Meaning |
| --- | --- |
| `value` | numeric value (e.g. `Math.PI`) |
| `lexerString` | exact characters matched in user input (e.g. `"π"`) |
| `tokenString` | normalized internal token name (e.g. `"PI"`) |

#### Operators

| Map key | `lexerString` | `tokenString` | Precedence | Associativity | Arity | `execute` |
| --- | --- | --- | --- | --- | --- | --- |
| `+` | `+` | `+` | 1 | left | 2 | `(a, b) => a + b` |
| `-` | `-` | `-` | 1 | left | 2 | `(a, b) => a - b` |
| `*` | `*` | `*` | 2 | left | 2 | `(a, b) => a * b` |
| `/` | `/` | `/` | 2 | left | 2 | throws `Operator / : Devide by Zero not allowed` if `b === 0`, else `a / b` |
| `%` | `%` | `%` | 2 | left | 2 | `(a, b) => a % b` |
| `^` | `^` | `^` | 4 | right | 2 | `(a, b) => Math.pow(a, b)` |
| `NEG` | `-` | `NEG` | 3 | right | 1 | `(a) => -a` (unary minus) |
| `PLUS` | `+` | `PLUS` | 3 | right | 1 | `(a) => a` (unary plus, identity) |
| `!` | `!` | `!` | 6 | left | 1 | `(a) => factorial(a)` (postfix factorial) |

`NEG` and `PLUS` also carry `allowAtFront: true`, which is unused.

#### Functions

| Map key | `lexerString` | `tokenString` | Precedence | Arity | `execute` |
| --- | --- | --- | --- | --- | --- |
| `sin` | `sin` | `sin` | 5 | 1 | `(x) => Math.sin(x)` |
| `cos` | `cos` | `cos` | 5 | 1 | `(x) => Math.cos(x)` |
| `tan` | `tan` | `tan` | 5 | 1 | throws `Operator Tan : Math Error` if `Math.abs(Math.cos(x)) < 1e-12`, else `Math.tan(x)` |
| `log` | `log` | `log` | 5 | 1 | throws `Operator Log : Values <= 0 not allowed in Log operator` if `x <= 0`, else `Math.log10(x)` |
| `ln` | `ln` | `ln` | 5 | 1 | throws `Operator Ln : Values <= 0 not allowed in Ln operator` if `x <= 0`, else `Math.log(x)` |
| `sqr-root` | `√` | `sqr-root` | 5 | 1 | throws `Operator sqrt : Negative values inside squre root not allowed` if `x < 0`, else `Math.sqrt(x)` |

#### Constants

| Map key | `lexerString` | `tokenString` | `value` |
| --- | --- | --- | --- |
| `PI` | `π` | `PI` | `Math.PI` |
| `E` | `e` | `E` | `Math.E` |

---

### 5.2 `src/calculator/tokenizer.js`

**Exports:** `default class Tokenizer`.

Converts an input string into an ordered array of `{ type, value }` tokens.

#### Constructor

```js
new Tokenizer(operators, functions, constants)
```

Converts the three Maps into plain arrays of their entry values and stores them for matching.

#### Public methods

```js
tokenize(str) → Array<{ type, value }>
```

Throws:

| Condition | Message |
| --- | --- |
| empty string (`str.length === 0`) | `Lexer : can not tokenize empty string` |
| character matched by no matcher | `Lexer : Invalid Input` |
| number with a second decimal point | `Lexer : Number Format not allowed` |

Whitespace (`" "`, `"\n"`, `"\t"`) is skipped.

#### Token types produced

| `type` | `value` | Produced by |
| --- | --- | --- |
| `NUMBER` | JavaScript number (e.g. `3`, `3.14`) | `#readNumber` |
| `OPERATOR` | normalized `tokenString`: `+` `-` `*` `/` `%` `^` `NEG` `PLUS` `!` | `#readOperator` |
| `BRACKET` | `"("` or `")"` | `#readParenthesis` and auto-insertion |
| `FUNCTION` | normalized `tokenString`: `sin` `cos` `tan` `log` `ln` `sqr-root` | `#readFunction` |
| `CONSTANT` | normalized `tokenString`: `PI` `E` | `#readConstant` |

#### Matcher order and behaviour

Matchers run in this order for each character: `#readNumber`, `#readOperator`, `#readParenthesis`, `#readFunction`, `#readConstant`. The first accepting matcher wins.

- **Numbers** — contiguous digits and a single decimal point; converted with `Number(...)`. A leading decimal (`.5`) and trailing decimal (`5.`) are both accepted because the matcher only enforces *at most one* point.
- **Unary detection** — `#readOperator` special-cases `-` and `+` before consulting the registry. `#isNegative(tokens)` returns true when the token list is empty or the previous token is **not** a `NUMBER`, `CONSTANT`, or `")"`; in that case `-` → `NEG` and `+` → `PLUS`, otherwise they stay binary `-`/`+`. This is hard-coded and does not use the `allowAtFront` registry field (see [§9](#9-observed-behaviours-quirks--discrepancies)).
- **Implicit multiplication** — `#implicitBefore` inserts an `OPERATOR(*)` when a `NUMBER`, `CONSTANT`, or `"("` directly follows a `NUMBER`, `CONSTANT`, or `")"` (e.g. `2π` → `2 * PI`).
- **Implicit function brackets** — `#implicitAfter` pushes a `BRACKET("(")` after every `FUNCTION` and increments `functionCounter`; when a `NUMBER`/`CONSTANT` follows, it flushes one `BRACKET(")")` per outstanding function. This is what makes `sin π` work without explicit parentheses, and it is also why explicit parentheses produce doubled brackets (see [§4.2](#42-sinπ6)).

#### Private methods

`#readNumber`, `#readOperator`, `#readParenthesis`, `#readFunction`, `#readConstant`, `#isDigit`, `#isNegative`, `#implicitBefore`, `#implicitAfter`.

---

### 5.3 `src/calculator/parser.js`

**Exports:** `default class Parser`.

Converts a token array into Reverse Polish Notation (RPN) using a shunting-yard style algorithm, validating structure and precedence.

#### Constructor

```js
new Parser(operators, functions, constants, Stack)
```

Stores the three Maps and the `Stack` class (instantiated per `parse()` call).

#### Public methods

```js
parse(tokens) → Array<{ type, value }>   // RPN
```

Throws:

| Condition | Message |
| --- | --- |
| `tokens` is falsy (`null`/`undefined`) | `Parser : Input tokens can not be zero` |
| unknown `token.type` | `Parser : Token type not available` |
| binary operator arrives while an operand is expected (except `NEG`/`PLUS`) | `Parser : Operand expected` |
| unmatched opening bracket at end of input | `Parser : Invalid Bracket Expression` |
| closing bracket exhausts the stack (after popping an operator) | `Parser  : Invalid Bracket Expression` (note double space) |
| closing bracket arrives on an empty stack | `Stack : Stack is Empty` (from `Stack.peek`, not a `Parser` message — see [§9](#9-observed-behaviours-quirks--discrepancies)) |

#### Parsing rules

- **`expectOperand`** tracks whether the next token must be an operand.
  - `NUMBER`/`CONSTANT` set it to `false`.
  - `FUNCTION` and `"("` set it to `true`.
  - `")"` sets it to `false`.
  - Operators other than `!` set it to `true`; `!` (postfix) leaves it unchanged.
  - Binary operators (anything except `NEG`/`PLUS`) throw if `expectOperand` is `true`.
- **Shunting-yard** — `#handleOperator` pops operators from the stack while the top has higher precedence, or equal precedence and the incoming operator is left-associative, then pushes the incoming operator. `#shouldPop(top, operator)` implements:
  - `top.precedence > operator.precedence` → pop
  - `top.precedence < operator.precedence` → keep
  - equal precedence → pop unless the incoming operator is `"right"` associative
- **Brackets** — `"("` is pushed; `")"` pops output until a `"("` is found, then discards the `"("`.
- **Functions** — pushed onto the stack; they are flushed to output when operators/brackets/end-of-input pop them, so the function ends up after its operand(s) in RPN.

Representative RPN results (from `parserTest.js`):

| Infix | RPN |
| --- | --- |
| `3 + 4` | `3 4 +` |
| `3 + 4 * 2` | `3 4 2 * +` |
| `(3 + 4) * 2` | `3 4 + 2 *` |
| `2 ^ 3 ^ 2` | `2 3 2 ^ ^` (right associativity) |
| `sin(30)` | `30 sin` |

#### Private methods

`#handleOperator`, `#handleFunction`, `#handleNumber`, `#handleConstant`, `#handleBracket`, `#shouldPop`.

---

### 5.4 `src/calculator/evaluator.js`

**Exports:** `default class Evaluator`.

Evaluates a postfix (RPN) token array into a numeric result using a stack.

#### Constructor

```js
new Evaluator(operators, functions, constants, Stack, precision)
```

#### Public methods

```js
evaluate(postfix) → number
```

Throws:

| Condition | Message |
| --- | --- |
| `postfix` is falsy | `Evaluation : empty postfix expression` |
| unknown `token.type` | `Evaluation : Token type not available` |
| stack size ≠ 1 at end | `Evaluation : Invalid PostFix Expression` |
| operator with empty stack | `Evaluation op: Invalid PostFix Expression 1` |
| operator with too few operands | `Evaluation op: Invalid PostFix Expression 2` |
| function with empty stack | `Evaluation fn: Invalid PostFix Exression 3` (typo in source) |
| function with too few operands | `Evaluation fn: Invalid PostFix Expression 4` |

#### Evaluation rules

- `NUMBER` → push `Number(token.value.toFixed(precision))`
- `CONSTANT` → push `Number(constants.get(token.value).value.toFixed(precision))`
- `OPERATOR`/`FUNCTION` → look up the registry entry, pop `arity` operands (unshifted so the first-popped operand is the left operand), call `execute(...operands)`, and push `Number(answer.toFixed(precision))`

Every pushed value is rounded through `toFixed(precision)` — with precision `15` in the shipped app. This is what turns `sin(π/6)` into `0.5` (see [§4.2](#42-sinπ6)).

#### Private methods

`#handleOperator`, `#handleFunction`, `#handleNumber`, `#handleConstant`.

---

### 5.5 `src/calculator/calculator.js`

**Exports:** `default class Calculator`.

Orchestrates the full pipeline: string → tokens → RPN → number.

#### Constructor

```js
new Calculator(Evaluator, Parser, Tokenizer, Stack, operators, functions, constants, precision)
```

Receives the four **classes** (not instances) plus the three registries and the rounding precision.

#### Public methods

```js
calculate(str) → number
```

For each call it:

1. Instantiates fresh `Evaluator`, `Parser`, and `Tokenizer` instances. If any construction throws, it rethrows as `Calc : Error loading the calculator <message>`.
2. `tokenizer.tokenize(str)` → infix tokens.
3. `parser.parse(infix)` → RPN.
4. `evaluator.evaluate(rpn)` → answer.

Observed behaviour: `calculate()` also executes `console.log(inFixExpression)`, printing the token array to the browser console on every calculation (see [§9](#9-observed-behaviours-quirks--discrepancies)).

---

### 5.6 `src/calculator/history.js`

**Exports:** `default class History`.

Manages the calculation history persisted in `localStorage`.

#### Constructor

```js
new History(key = "calc_history")
```

#### Public methods

| Method | Behaviour |
| --- | --- |
| `getItems()` | reads `localStorage.getItem(key)`; returns `JSON.parse(items)`; returns `[]` if the key is absent **or** parsing throws (logs the parse error via `console.error`) |
| `clear()` | `localStorage.removeItem(key)` |
| `push(item)` | reads current items, appends `item`, writes `JSON.stringify(items)` back |

**App key:** the controller constructs `new History("calc-1")`, so the running app uses the `calc-1` key, not the `calc_history` default (see [§9](#9-observed-behaviours-quirks--discrepancies)).

---

### 5.7 `src/UI/calculatorController.js`

**Exports:** `default class CalculatorController`.

**Imports:** `isDigit` from `../utils/uitls.js`.

Wires the view, input handling, history, and calculator logic together. All methods are private (`#`); the only public surface is the constructor.

#### Constructor

```js
new CalculatorController(Stack, History, calculator, view)
```

- `view` is the `.container` DOM element.
- Instantiates `new History("calc-1")`.
- Runs `#initDom()`, `#initClickHandlers()`, `#initKeyHandlers()`.
- Initializes state: `error = false`, `empty = true`, `allowSubmit = false`, and the `actions` map.
- Calls `#displayHistory()` once.

`Stack` is accepted but **never used** (see [§9](#9-observed-behaviours-quirks--discrepancies)).

#### State flags

| Flag | Meaning |
| --- | --- |
| `empty` | `true` when the display is in its initial `"0"` placeholder state |
| `error` | `true` after a failed calculation; cleared on the next input |
| `allowSubmit` | `true` once the user has entered something that can finish an expression; `calculate` is a no-op while `false` |
| `lastAnswer` | previous successful result, used by the `Ans` action |
| `actions` | maps action names → private handlers: `clear`, `delete`, `toggleSign`, `reciprocal`, `calculate` |

#### Private methods (grouped)

**Setup:** `#initDom`, `#initClickHandlers`, `#initKeyHandlers`, `#changeTheme`.

**Input routing:** `#handleClick`, `#handleKeyDown`, `#handleInput`.

**Display helpers:** `#getDisplay`, `#updateDisplay`, `#clearDisplay`, `#clearError`, `#deleteChar`.

**Actions:** `#handleSubmit`, `#toggleSign`, `#reciprocal`.

**History:** `#displayHistory`, `#clearHistory`, `#handleHistoryClick`.

#### `#updateDisplay(str)` note

When `empty` is `true`, the controller assumes the display holds the placeholder `"0"` and writes `str.slice(1)` — i.e. it strips the first character of the concatenated string. Because every input is built as `#getDisplay() + <fragment>`, a fresh numeric input `"0" + "7"` becomes `"7"`. A fresh non-numeric input (e.g. `π`) can therefore leave a leading space (e.g. `" π "`); the tokenizer tolerates this because it skips whitespace.

---

### 5.8 `src/utils/stack.js`

**Exports:** `default class Stack`.

A minimal LIFO stack used by both the parser and the evaluator.

#### Constructor

```js
new Stack()
```

#### Public methods

| Method | Behaviour | Returns |
| --- | --- | --- |
| `push(item)` | appends to the internal array | new length |
| `pop()` | removes and returns the top item; throws `Stack : Stack Underflow` when empty | item |
| `peek(index = 0)` | returns the item `index` positions from the top (0 = top); throws `Stack : Stack is Empty` when empty and `Stack : Index out of Range` when `index >= size` | item |
| `isEmpty()` | true when empty | boolean |
| `size()` | current count | number |
| `clear()` | empties the internal array | `true` |

---

### 5.9 `src/utils/uitls.js`

**Exports:** named exports `isDigit`, `factorial`. (Filename is `uitls.js`, a typo of "utils" — see [§9](#9-observed-behaviours-quirks--discrepancies).)

```js
function isDigit(char)   // true when charCode is 48–57 (0–9)
function factorial(n)    // recursive: n * factorial(n - 1); base case n <= 1 returns 1
```

`factorial` is used by the `!` operator. Because the base case is `n <= 1`, `factorial(0) = 1`, `factorial(1) = 1`, `factorial(-1) = 1`, and non-integer values recurse (`factorial(2.5) = 3.75`) — see [§9](#9-observed-behaviours-quirks--discrepancies).

---

## 6. UI behaviours

### 6.1 Keyboard map (`#handleKeyDown`)

Handled on `document` `keydown`. The key is translated into the same data shape used by clicks, then `#clearError()` and `#handleInput(data)` run, and `preventDefault()` is called.

| Key | Data produced | Effect |
| --- | --- | --- |
| `0`–`9` | `{ number: key }` | append digit |
| `.` | `{ number: "." }` | append decimal point |
| `+` `-` `*` `/` `%` | `{ operator: key }` | append `" {op} "`; `allowSubmit = true` |
| `(` | `{ bracket: "left" }` | append `" ( "`; `allowSubmit = true` |
| `)` | `{ bracket: "right" }` | append `" ) "`; `allowSubmit = true` |
| `^` | `{ function: "power" }` | append `" ^ "`; `allowSubmit = true` |
| `a` (lowercase only) | `{ function: "ans" }` | append `lastAnswer` if defined |
| `c` (lowercase only) | `{ action: "clear" }` | clear display |
| `Enter` | `{ action: "calculate" }` | evaluate |
| `Backspace` | `{ action: "delete" }` | delete last char/token |
| anything else | — | ignored (returns before `preventDefault`) |

Note: only lowercase `a` and `c` are handled; the on-screen help text says `C` and `A` (uppercase) — see [§9](#9-observed-behaviours-quirks--discrepancies).

### 6.2 Click-to-action routing (`#handleClick` → `#handleInput`)

`#handleClick` reads `e.target.dataset` from the button grid and passes it to `#handleInput`. `#handleInput` dispatches on which `data-*` attribute is present:

| Attribute present | Routing | Examples |
| --- | --- | --- |
| `data-action` | `this.actions[data.action]()` | `clear`, `delete`, `toggleSign`, `reciprocal`, `calculate` |
| `data-number` | append the number to the display | `0`–`9`, `.` |
| `data-operator` | append `" {op} "`; `allowSubmit = true` | `%`, `/`, `*`, `-`, `+` |
| `data-function` | special cases below | `sin`, `cos`, `tan`, `sqrt`, `log`, `ln`, `pi`, `e`, `power`, `factorial`, `ans` |
| `data-bracket` | `"left"` → append `" ( "`, `"right"` → append `" ) "`; `allowSubmit = true` | `left`, `right` |
| none | `console.error("Invalid Click")` | — |

`data-function` special cases:

| `data-function` | Appended to display | `allowSubmit` |
| --- | --- | --- |
| `pi` | `" π "` | `true` |
| `sqrt` | `" √ "` | `true` |
| `power` | `" ^ "` | `true` |
| `factorial` | `" ! "` | `true` |
| `ans` | `lastAnswer` (if defined, no padding) | unchanged |
| anything else (`sin`, `cos`, `tan`, `log`, `ln`, `e`) | `" {name} "` | `true` |

The action buttons work as follows:

| Action | Handler | Behaviour |
| --- | --- | --- |
| `clear` | `#clearDisplay` | `empty = true`, `innerHTML = 0` |
| `delete` | `#deleteChar` | remove last char/token; restore `"0"` + `empty = true` when emptied |
| `toggleSign` | `#toggleSign` | insert/remove leading `-` on the last operand or parenthesized group; no-op otherwise |
| `reciprocal` | `#reciprocal` | wrap the last operand/group in `1 / ( ... )`; no-op otherwise |
| `calculate` | `#handleSubmit` | evaluate the current display |

### 6.3 Error-message mapping (`#handleSubmit` catch)

The controller catches any thrown error and maps its message **prefix** to a user-facing display message:

| Thrown message starts with | Displayed message |
| --- | --- |
| `Parser` | `Invalid Expression` |
| `Evaluation` | `Invalid Expression` |
| `Operator` | `Math Error` |
| `Lexer` | `Invalid Input` |
| anything else (e.g. `Stack`, `Calc`, `TypeError`) | `Something Went Wrong` |

The underlying thrown messages are:

| Module | Thrown messages |
| --- | --- |
| Lexer | `Lexer : can not tokenize empty string`, `Lexer : Invalid Input`, `Lexer : Number Format not allowed` |
| Parser | `Parser : Input tokens can not be zero`, `Parser : Token type not available`, `Parser : Operand expected`, `Parser : Invalid Bracket Expression`, `Parser  : Invalid Bracket Expression` |
| Evaluator | `Evaluation : empty postfix expression`, `Evaluation : Token type not available`, `Evaluation : Invalid PostFix Expression`, `Evaluation op: Invalid PostFix Expression 1`, `Evaluation op: Invalid PostFix Expression 2`, `Evaluation fn: Invalid PostFix Exression 3`, `Evaluation fn: Invalid PostFix Expression 4` |
| Operations | `Operator / : Devide by Zero not allowed`, `Operator Tan : Math Error`, `Operator Log : Values <= 0 not allowed in Log operator`, `Operator Ln : Values <= 0 not allowed in Ln operator`, `Operator sqrt : Negative values inside squre root not allowed` |
| Stack | `Stack : Stack Underflow`, `Stack : Stack is Empty`, `Stack : Index out of Range` |
| Calculator | `Calc : Error loading the calculator <message>` |

On a failed calculation the controller also sets `error = true` and `console.error(e)`. The next input clears the error state back to `"0"`.

### 6.4 Precision & rounding

The app is composed with `precision = 15`. The evaluator applies `Number(value.toFixed(15))` to every operand push and every operation result. This means:

- `1 / 3` evaluates to `0.333333333333333`.
- `sin(π/6)` evaluates to `0.5` rather than `0.49999999999999994`.
- Intermediate results are rounded at **each** step, not just at the end.

### 6.5 `localStorage` keys

| Consumer | Key | Notes |
| --- | --- | --- |
| `CalculatorController` | `calc-1` | the key actually used by the app (passed as `new History("calc-1")`) |
| `History` default | `calc_history` | only used if `History` is instantiated with no argument |

History entries are stored as a JSON array of `{ expression, answer }` objects, with the newest entry last.

### 6.6 Theme system

- The toggle button (`#themeBtn`) is wired in `#initClickHandlers` to `#changeTheme`, which calls `document.getElementsByTagName("body")[0].classList.toggle("dark-mode")`.
- Light theme values are defined on `:root`; dark theme values are redefined under `body.dark-mode` (see [§8](#8-styles--assets)).
- The toggle is **not persisted** — the theme resets to light on reload.
- The button icon is static `🌙` and does not change with the theme.

---

## 7. Tests

The project uses a **custom in-browser console test runner** — no framework and no Node runner. There are 8 files in `src/test/`:

| File | What it exercises |
| --- | --- |
| `testRunner.js` | async harness that imports the other test files (all import lines currently commented out) |
| `stackTest.js` | `Stack`: empty, LIFO order, `peek`, `peek(index)`, bounds/underflow errors, `clear`, mixed types, 1000-item volume |
| `operatorTest.js` | individual `operators`/`functions` `execute()` calls, including divide-by-zero and domain errors |
| `evaluatorTest.js` | `Evaluator.evaluate()` on hand-built RPN arrays — arithmetic, functions, constants, invalid cases, and a return-type check |
| `parserTest.js` | `Parser.parse()` on hand-built token arrays — expected RPN strings, precedence, right associativity, functions, brackets, error cases |
| `tokenizerTest.js` | `Tokenizer.tokenize()` — unary `-`/`+`, decimals, constants, functions, stress input, error cases |
| `calculatorTest.js` | end-to-end `Calculator.calculate(expr)` with floating-point tolerance — arithmetic, exponentiation, constants, functions, whitespace, unary minus, error cases |
| `calculatorControllerTest.js` | constructs `CalculatorController` against the real calculator and the `.container` DOM element (wiring/instantiation check, no assertions) |

Each test file logs its own `===== ... =====` banner plus per-test `✅ PASS` / `❌ FAIL` lines. `testRunner.js` logs `Running tests!` and `All test completed`.

### 7.1 Activation steps

1. In `index.html`, uncomment the test-runner script:

   ```html
   <!-- before -->
   <!-- <script src="src/test/testRunner.js" type="module" defer></script> -->

   <!-- after -->
   <script src="src/test/testRunner.js" type="module" defer></script>
   ```

2. In `src/test/testRunner.js`, uncomment the desired `await import("./...")` lines:

   ```js
   await import("./stackTest.js");
   await import("./operatorTest.js");
   await import("./evaluatorTest.js");
   await import("./parserTest.js");
   await import("./tokenizerTest.js");
   await import("./calculatorTest.js");
   await import("./calculatorControllerTest.js");
   ```

3. Reload `index.html` in a browser and open the developer console; results print there.

### 7.2 Test notes

- Test files are side-effect scripts — importing them runs the assertions immediately.
- `calculatorControllerTest.js` needs the real DOM (`.container`) to exist, so it must run in the browser with `index.html` loaded.
- Two tokenizer tests currently disagree with the real tokenizer output (nested functions and function-without-bracket; see [§9](#9-observed-behaviours-quirks--discrepancies)), so they report `FAIL`.

---

## 8. Styles & assets

### 8.1 `styles/style.css`

- **CSS variables** on `:root` define the light theme: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--text-primary`, `--text-secondary`, `--border-color`, `--display-bg`, `--button-bg`, `--button-border`, `--button-hover`, `--operator-bg`, `--operator-text`, `--operator-hover`, `--function-bg`, `--function-text`, `--function-hover`, `--equals-bg`, `--equals-text`, `--equals-hover`, `--scientific-bg`, `--scientific-text`, `--scientific-hover`, `--shadow`, `--shadow-lg`.
- **Dark mode** — `body.dark-mode` redefines the same variables with dark values. The body has a `0.3s` background/color transition.
- **Layout** — `.container` is a two-column grid (`1fr 1fr`, gap `30px`, max-width `1200px`); the calculator is the left column and the history panel the right column.
- **Button classes** — `.btn-number`, `.btn-operator`, `.btn-function` (AC/DEL/±/1/x/n!), `.btn-scientific` (sin/cos/tan/√/log/ln/π/e/x^y), `.btn-equals` (spans 2 columns), `.btn-zero` (spans 2 columns).
- **Display area** — `.display-area` holds `.history-display` (the just-evaluated expression) and `.current-display` (the active input/result).
- **History panel** — `.history-list` scrolls (max-height `400px`) with styled scrollbar; `.history-item` rows show expression and result and are clickable.
- **Accessibility** — `.btn:focus` gets a `2px` outline using `--operator-bg`.

### 8.2 Responsive breakpoints

| Breakpoint | Changes |
| --- | --- |
| `max-width: 768px` | container collapses to one column; smaller paddings/fonts; history header stacks vertically |
| `max-width: 480px` | tighter paddings and fonts; body padding `10px`; theme button shrinks |

### 8.3 Assets

| File | Used for |
| --- | --- |
| `assets/light-theme.png` | light-theme screenshot in the README |
| `assets/dark-theme.png` | dark-theme screenshot in the README |

The favicon is loaded from an external URL (`https://lunch-app.simform.solutions/Images/favicon.ico`) in `index.html`.

---

## 9. Observed behaviours, quirks & discrepancies

This section records places where the code disagrees with the README/project brief, where behaviour is surprising, or where rough edges remain. Per [ADR-0001](adr/0001-document-actual-behaviour.md), these are documented, not fixed.

| # | Area | Observation |
| --- | --- | --- |
| 1 | README typos | README refers to `index 1.html` (should be `index.html`) and lists `src/utils/utils.js`, but the actual file is `src/utils/uitls.js`. |
| 2 | Debug logging | `Calculator.calculate()` contains a leftover `console.log(inFixExpression)` that prints the token array to the console on **every** calculation. |
| 3 | Unused dependency | `CalculatorController`'s constructor accepts `Stack` but never references it. |
| 4 | Dead registry field | `allowAtFront` is set on the `NEG` and `PLUS` operator entries but is never read; the tokenizer hard-codes unary detection instead. |
| 5 | History key mismatch | `History`'s default key is `calc_history`, but the controller instantiates `new History("calc-1")`, so the app persists history under `calc-1`. |
| 6 | Unreachable empty-state | `#displayHistory` checks `if (!historyItems)`, but `getItems()` returns `[]` (truthy) when nothing is stored, so the `"No calculations yet"` branch never renders; an empty history panel is simply blank. |
| 7 | `#clearDisplay` type | `#clearDisplay` assigns `this.display.innerHTML = 0` (a number) rather than the string `"0"`; the browser coerces it, so the visible result is unchanged. |
| 8 | `factorial` domain | `factorial` returns `1` for any `n <= 1`, so `factorial(-1)` = 1 and non-integers recurse — e.g. `factorial(2.5)` = 3.75. |
| 9 | "No hardcoded logic" claim | The README/module docs claim operations are fully registry-driven, but the tokenizer hard-codes `-`/`+` unary detection and the controller hard-codes function names (`pi`, `sqrt`, `power`, `factorial`, `ans` vs a generic default). |
| 10 | Silent no-ops | `#toggleSign` and `#reciprocal` do nothing unless the display ends in a digit or a `)` (with trailing space); there is no user feedback otherwise. |
| 11 | Parser pop-loop edge case | In `#handleOperator`, after the first pop the loop recomputes `top` via `this.operators.get(...)` only; a function token on top would produce `undefined` and `#shouldPop` would throw a `TypeError`. Not triggered by the current operator/function precedence layout in normal use. |
| 12 | Cosmetic typos & numbering | Error strings contain misspellings (`Devide`, `squre`, `Exression`). `tokenizerTest.js` skips test number 15; `calculatorTest.js` skips numbers 21, 35–39, 41, 45. |
| 13 | Tokenizer test expectations | `tokenizerTest.js` expects idealized sequences that the real tokenizer does not produce. For `sin(cos(30))` it expects `sin ( cos ( 30 ) )`, but the tokenizer emits `sin ( ( cos ( ( 30 ) ) ) )`; for `sin30` it expects `sin 30`, but the tokenizer emits `sin ( 30 )`; for `3++4` it expects `3 + + 4`, but the tokenizer emits `3 + PLUS 4`. These assertions fail against current code. |
| 14 | Leading `)` error | A leading closing bracket (`")3"`) reaches `#handleBracket` with an empty stack, so `Stack.peek()` throws `Stack : Stack is Empty` before the parser's own bracket check. The controller maps that to `Something Went Wrong` rather than `Invalid Expression`. |
| 15 | Uppercase keyboard keys | The on-screen help says `C` for Clear and `A` for Ans, but `#handleKeyDown` only matches lowercase `c` and `a`; `C`/`A` (e.g. with Shift) are ignored. |

---

## 10. Suggested follow-ups (not applied)

These are candidate improvements surfaced by the observations above. **None of them has been applied** — they are listed for future work.

1. Fix README typos: `index 1.html` → `index.html`, and `utils.js` → `uitls.js`.
2. Remove the leftover `console.log(inFixExpression)` in `calculator.js`.
3. Remove the unused `Stack` parameter from `CalculatorController`, or use it.
4. Either honour `allowAtFront` in the tokenizer or remove the dead field.
5. Align the history key (single source of truth for `calc-1` vs `calc_history`).
6. Fix the unreachable `"No calculations yet"` branch in `#displayHistory` (check for an empty array instead of falsiness).
7. Assign `"0"` (string) instead of `0` in `#clearDisplay` for consistency.
8. Decide and document the intended `factorial` domain for `n <= 1` and non-integers.
9. Reconcile the "no hardcoded logic" claim with the hard-coded unary detection and function-name switch, or move them into the registry.
10. Give feedback (or disable) `toggleSign`/`reciprocal` when they cannot apply.
11. Harden the parser pop loop against non-operator stack tops.
12. Correct the misspelled error messages and tidy test numbering.
13. Reconcile `tokenizerTest.js` expectations with the real auto-bracket behaviour (or change the tokenizer).
14. Handle a leading `)` with a `Parser` error rather than leaking `Stack : Stack is Empty`.
15. Accept uppercase `C`/`A` in `#handleKeyDown`, or update the help text to say lowercase.
