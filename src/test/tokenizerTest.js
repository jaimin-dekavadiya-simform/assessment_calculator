import { constants, functions, operators } from "../calculator/operations.js";
import Tokenizer from "../calculator/tokenizer.js";

const tokenizer = new Tokenizer(operators, functions, constants);

// ===============================
// TEST RUNNER FOR YOUR TOKENIZER
// ===============================

function runTest(name, input, expected) {
  try {
    const result = tokenizer
      .tokenize(input)
      .map((x) => x.value)
      .join(" ");

    console.log("====================================");
    console.log("Test:", name);
    console.log("Input:", input);
    console.log("Expected:", expected);
    console.log("Result  :", result);
    console.log(result === expected ? "✅ PASS" : "❌ FAIL");
  } catch (err) {
    console.log("====================================");
    console.log("Test:", name);
    console.log("Input:", input);
    console.log("Expected:", expected);
    console.log("Result  : ERROR ->", err.message);
    console.log(expected === "ERROR" ? "✅ PASS" : "❌ FAIL");
  }
}

// ===============================
// CALL TESTS
// ===============================

// 1 Basic
runTest("Basic Addition", "3+4", "3 + 4");

// 2 Unary at start
runTest("Unary Start", "-5+4", "NEG 5 + 4");

// 3 Unary after operator
runTest("Unary After Operator", "5*-3", "5 * NEG 3");

// 4 Double Unary
runTest("Double Unary", "--5", "NEG NEG 5");

// 5 Unary inside brackets
runTest("Unary Inside Brackets", "5*(-3)", "5 * ( NEG 3 )");

// 6 Decimal numbers
runTest("Decimals", "3.14+2.5", "3.14 + 2.5");

// 7 Constants
runTest("Constants", "e^2+π", "E ^ 2 + PI");

// 8 Mixed constants
runTest("Mixed Constants", "π+e", "PI + E");

// 9 Nested functions
runTest("Nested Functions", "sin(cos(30))", "sin ( cos ( 30 ) )");

// 10 Complex expression
runTest(
  "Complex Expression",
  "-5+4+tan(5)-4-5*8*7/3",
  "NEG 5 + 4 + tan ( 5 ) - 4 - 5 * 8 * 7 / 3",
);

// 11 Deep nesting
runTest(
  "Deep Nesting",
  "((3+4)*(5-2))/(7+1)",
  "( ( 3 + 4 ) * ( 5 - 2 ) ) / ( 7 + 1 )",
);

// 12 Power chain
runTest("Power Chain", "2^3^2", "2 ^ 3 ^ 2");

// 13 Unary with power
runTest("Unary with Power", "-2^3", "NEG 2 ^ 3");

// 14 Unary before bracket
runTest("Unary Before Bracket", "-(3+4)", "NEG ( 3 + 4 )");

// 16 Invalid character
runTest("Invalid Character", "3+4a", "ERROR");

// 17 Consecutive operators
runTest("Consecutive Operators", "3++4", "3 + + 4");

// 18 Function without bracket
runTest("Function Without Bracket", "sin30", "sin 30");

// 19 Empty input
runTest("Empty Input", "", "ERROR");

// 20 Very complex stress case
runTest(
  "Ultimate Stress Test",
  "-sin(3+4*2)-cos(-5/2)+tan(8-3*2)+log(10)+e^π-3.5*2.1",
  "NEG sin ( 3 + 4 * 2 ) - cos ( NEG 5 / 2 ) + tan ( 8 - 3 * 2 ) + log ( 10 ) + E ^ PI - 3.5 * 2.1",
);
