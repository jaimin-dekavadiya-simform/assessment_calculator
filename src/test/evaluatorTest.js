import Evaluator from "../calculator/evaluator.js";
import { operators, functions, constants } from "../calculator/operations.js";
const evaluator = new Evaluator(operators, functions, constants);

console.log(
  evaluator.evaluate([
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 1 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "tan" },
  ]),
);
// ==========================
// BASIC OPERATOR TESTS
// ==========================

// 1) 5 1 2 + 4 * + 3 -  → 14
console.log(
  "Test 1:",
  evaluator.evaluate([
    { type: "NUMBER", value: 5 },
    { type: "NUMBER", value: 1 },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "*" },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "-" },
  ]),
);

// 2) 6 2 / 3 ^  → 27
console.log(
  "Test 2:",
  evaluator.evaluate([
    { type: "NUMBER", value: 6 },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "/" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "^" },
  ]),
);

// 3) 2 3 4 + * → 14
console.log(
  "Test 3:",
  evaluator.evaluate([
    { type: "NUMBER", value: 2 },
    { type: "NUMBER", value: 3 },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "+" },
    { type: "OPERATOR", value: "*" },
  ]),
);

// ==========================
// FUNCTION TESTS
// ==========================

// 4) 5 ! → 120
console.log(
  "Test 4:",
  evaluator.evaluate([
    { type: "NUMBER", value: 5 },
    { type: "OPERATOR", value: "!" },
  ]),
);

// 5) 2 root → √2
console.log(
  "Test 5:",
  evaluator.evaluate([
    { type: "NUMBER", value: 2 },
    { type: "FUNCTION", value: "sqr-root" },
  ]),
);

// ==========================
// TRIG TESTS (Assuming degree mode)
// ==========================

// 6) π/2 sin → 1
console.log(
  "Test 6 (π/2 sin):",
  evaluator.evaluate([
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "sin" },
  ]),
);

// 7) π/3 cos → 0.5
console.log(
  "Test 7 (π/3 cos):",
  evaluator.evaluate([
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "cos" },
  ]),
);

// 8) π/4 tan → 1
console.log(
  "Test 8 (π/4 tan):",
  evaluator.evaluate([
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "tan" },
  ]),
);

// ==========================
// LOG TESTS
// ==========================

// 9) 10 log → 1
console.log(
  "Test 9:",
  evaluator.evaluate([
    { type: "NUMBER", value: 10 },
    { type: "FUNCTION", value: "log" },
  ]),
);

// 10) E ln → 1
console.log(
  "Test 10:",
  evaluator.evaluate([
    { type: "CONSTANT", value: "E" },
    { type: "FUNCTION", value: "ln" },
  ]),
);

// ==========================
// CONSTANT + OPERATOR
// ==========================

// 11) PI 4 / tan → 1
console.log(
  "Test 11:",
  evaluator.evaluate([
    { type: "CONSTANT", value: "PI" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "tan" },
  ]),
);

// ==========================
// FRACTION TEST
// ==========================

// 12) 1 3 / → 0.333...
console.log(
  "Test 12:",
  evaluator.evaluate([
    { type: "NUMBER", value: 1 },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "/" },
  ]),
);

// ==========================
// INVALID CASES
// ==========================

try {
  console.log(
    "Test 13:",
    evaluator.evaluate([{ type: "OPERATOR", value: "+" }]),
  );
} catch (e) {
  console.log("Test 13 Error:", e.message);
}

try {
  console.log(
    "Test 14:",
    evaluator.evaluate([
      { type: "NUMBER", value: 5 },
      { type: "OPERATOR", value: "+" },
    ]),
  );
} catch (e) {
  console.log("Test 14 Error:", e.message);
}

// ==========================
// TYPE CHECK (VERY IMPORTANT)
// ==========================

const result = evaluator.evaluate([
  { type: "NUMBER", value: 2 },
  { type: "NUMBER", value: 3 },
  { type: "OPERATOR", value: "+" },
]);

console.log("Type Check:", typeof result); // Should be "number", not "string"
