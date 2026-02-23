import { operators, functions, constants } from "../calculator/operations.js";
import Parser from "../calculator/parser.js";

const parser = new Parser(operators, functions, constants);

// ===============================
// TEST RUNNER FOR YOUR PARSER
// ===============================

function runTest(name, tokens, expected, parser) {
  try {
    const result = parser.parse(tokens);
    const resultString = result.map((t) => t.value).join(" ");

    console.log("====================================");
    console.log("Test:", name);
    console.log("Expected:", expected);
    console.log("Result  :", resultString);
    console.log(resultString === expected ? "✅ PASS" : "❌ FAIL");
  } catch (err) {
    console.log("====================================");
    console.log("Test:", name);
    console.log("Expected:", expected);
    console.log("Result  : ERROR ->", err.message);
    console.log(expected === "ERROR" ? "✅ PASS" : "❌ FAIL");
  }
}

// ===============================
// CALL TESTS
// ===============================

// 1
runTest(
  "3 + 4",
  [
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
  ],
  "3 4 +",
  parser,
);

// 2
runTest(
  "3 + 4 * 2",
  [
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "*" },
    { type: "NUMBER", value: 2 },
  ],
  "3 4 2 * +",
  parser,
);

// 3
runTest(
  "(3 + 4) * 2",
  [
    { type: "BRACKET", value: "(" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
    { type: "BRACKET", value: ")" },
    { type: "OPERATOR", value: "*" },
    { type: "NUMBER", value: 2 },
  ],
  "3 4 + 2 *",
  parser,
);

// 4
runTest(
  "3 + 4 * 2 / (1 - 5)",
  [
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "*" },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "/" },
    { type: "BRACKET", value: "(" },
    { type: "NUMBER", value: 1 },
    { type: "OPERATOR", value: "-" },
    { type: "NUMBER", value: 5 },
    { type: "BRACKET", value: ")" },
  ],
  "3 4 2 * 1 5 - / +",
  parser,
);

// 5 (Right Associativity)
runTest(
  "2 ^ 3 ^ 2",
  [
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "^" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "^" },
    { type: "NUMBER", value: 2 },
  ],
  "2 3 2 ^ ^",
  parser,
);

// 6 Function
runTest(
  "sin(30)",
  [
    { type: "FUNCTION", value: "sin" },
    { type: "BRACKET", value: "(" },
    { type: "NUMBER", value: 30 },
    { type: "BRACKET", value: ")" },
  ],
  "30 sin",
  parser,
);

// 7 Nested Functions
runTest(
  "sin(cos(30))",
  [
    { type: "FUNCTION", value: "sin" },
    { type: "BRACKET", value: "(" },
    { type: "FUNCTION", value: "cos" },
    { type: "BRACKET", value: "(" },
    { type: "NUMBER", value: 30 },
    { type: "BRACKET", value: ")" },
    { type: "BRACKET", value: ")" },
  ],
  "30 cos sin",
  parser,
);

// 8 Constants
runTest(
  "E ^ 2 + PI",
  [
    { type: "CONSTANT", value: "E" },
    { type: "OPERATOR", value: "^" },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "+" },
    { type: "CONSTANT", value: "PI" },
  ],
  "E 2 ^ PI +",
  parser,
);

// 9 Complex Expression
runTest(
  "sin(3 + 4 * 2) ^ 2 / log(10)",
  [
    { type: "FUNCTION", value: "sin" },
    { type: "BRACKET", value: "(" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
    { type: "OPERATOR", value: "*" },
    { type: "NUMBER", value: 2 },
    { type: "BRACKET", value: ")" },
    { type: "OPERATOR", value: "^" },
    { type: "NUMBER", value: 2 },
    { type: "OPERATOR", value: "/" },
    { type: "FUNCTION", value: "log" },
    { type: "BRACKET", value: "(" },
    { type: "NUMBER", value: 10 },
    { type: "BRACKET", value: ")" },
  ],
  "3 4 2 * + sin 2 ^ 10 log /",
  parser,
);

// 10 Error Case - Mismatched Bracket
runTest(
  "Mismatched Bracket",
  [
    { type: "BRACKET", value: "(" },
    { type: "NUMBER", value: 3 },
    { type: "OPERATOR", value: "+" },
    { type: "NUMBER", value: 4 },
  ],
  "ERROR",
  parser,
);
