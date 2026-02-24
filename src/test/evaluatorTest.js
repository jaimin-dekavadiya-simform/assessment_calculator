import Evaluator from "../calculator/evaluator.js";
import { operators, functions, constants } from "../calculator/operations.js";
import Stack from "../utils/stack.js";
const evaluator = new Evaluator(operators, functions, constants, Stack, 15);

// ===============================
// TEST RUNNER
// ===============================

function runEvalTest(name, tokens, expected) {
  try {
    const result = evaluator.evaluate(tokens);

    const isNumber = typeof result === "number";
    const isClose =
      isNumber && typeof expected === "number"
        ? Math.abs(result - expected) < 1e-10
        : result === expected;

    console.log("====================================");
    console.log("Test:", name);
    console.log("Expected:", expected);
    console.log("Result  :", result);
    console.log(isClose ? "✅ PASS" : "❌ FAIL");
  } catch (err) {
    console.log("====================================");
    console.log("Test:", name);
    console.log("Expected:", expected);
    console.log("Result  : ERROR ->", err.message);
    console.log(expected === "ERROR" ? "✅ PASS" : "❌ FAIL");
  }
}

// ===============================
// BASIC OPERATOR TESTS
// ===============================

// 1) 5 1 2 + 4 * + 3 - → 14
runEvalTest(
  "Basic Complex Expression",
  [
    { type: "NUMBER", value: 5 },
    { type: "NUMBER", value: 1 },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "*" },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "-" },
  ],
  14,
);

// 2) 6 2 / 3 ^ → 27
runEvalTest(
  "Division + Power",
  [
    { type: "NUMBER", value: 6 },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "/" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "^" },
  ],
  27,
);

// 3) 2 3 4 + * → 14
runEvalTest(
  "Nested Multiplication",
  [
    { type: "NUMBER", value: 2 },
    { type: "NUMBER", value: 3 },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "+" },
    { type: "OPERATOR", value: "*" },
  ],
  14,
);

// ===============================
// FUNCTION TESTS
// ===============================

// 4) 5 ! → 120
runEvalTest(
  "Factorial",
  [
    { type: "NUMBER", value: 5 },
    { type: "OPERATOR", value: "!" },
  ],
  120,
);

// 5) 2 sqrt → √2
runEvalTest(
  "Square Root",
  [
    { type: "NUMBER", value: 2 },
    { type: "FUNCTION", value: "sqr-root" },
  ],
  Math.sqrt(2),
);

// ===============================
// TRIG TESTS (Radians assumed)
// ===============================

// 6) π/2 sin → 1
runEvalTest(
  "Sin PI/2",
  [
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "sin" },
  ],
  1,
);

// 7) π/3 cos → 0.5
runEvalTest(
  "Cos PI/3",
  [
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "cos" },
  ],
  0.5,
);

// 8) π/4 tan → 1
runEvalTest(
  "Tan PI/4",
  [
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "tan" },
  ],
  1,
);

// ===============================
// LOG TESTS
// ===============================

// 9) 10 log → 1
runEvalTest(
  "Log Base 10",
  [
    { type: "NUMBER", value: 10 },
    { type: "FUNCTION", value: "log" },
  ],
  1,
);

// 10) E ln → 1
runEvalTest(
  "Natural Log",
  [
    { type: "CONSTANT", value: "E" },
    { type: "FUNCTION", value: "ln" },
  ],
  1,
);

// ===============================
// CONSTANT + OPERATOR
// ===============================

// 11) PI 4 / tan → 1
runEvalTest(
  "Tan PI/4 Again",
  [
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "tan" },
  ],
  1,
);

// ===============================
// FRACTION TEST
// ===============================

// 12) 1 3 / → 0.333...
runEvalTest(
  "Fraction",
  [
    { type: "NUMBER", value: 1 },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "/" },
  ],
  1 / 3,
);

// ===============================
// INVALID CASES
// ===============================

// 13) Only operator
runEvalTest("Only Operator", [{ type: "OPERATOR", value: "+" }], "ERROR");

// 14) Missing operand
runEvalTest(
  "Missing Operand",
  [
    { type: "NUMBER", value: 5 },
    { type: "OPERATOR", value: "+" },
  ],
  "ERROR",
);

// ===============================
// TYPE CHECK
// ===============================

const typeCheck = evaluator.evaluate([
  { type: "NUMBER", value: 2 },
  { type: "NUMBER", value: 3 },
  { type: "OPERATOR", value: "+" },
]);

console.log("====================================");
console.log("Type Check:", typeof typeCheck);
console.log(typeof typeCheck === "number" ? "✅ PASS" : "❌ FAIL");
