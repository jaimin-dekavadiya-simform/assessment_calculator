import { operators, functions } from "../calculator/operations.js";

// ===============================
// TEST HELPERS
// ===============================

function runOperatorTest(name, operatorKey, args, expected) {
  try {
    const result = operators.get(operatorKey).execute(...args);

    const isClose =
      typeof result === "number" && typeof expected === "number"
        ? Math.abs(result - expected) < 1e-10
        : result === expected;

    console.log("====================================");
    console.log("Operator Test:", name);
    console.log("Expected:", expected);
    console.log("Result  :", result);
    console.log(isClose ? "✅ PASS" : "❌ FAIL");
  } catch (err) {
    console.log("====================================");
    console.log("Operator Test:", name);
    console.log("Expected:", expected);
    console.log("Result  : ERROR ->", err.message);
    console.log(expected === "ERROR" ? "✅ PASS" : "❌ FAIL");
  }
}

function runFunctionTest(name, functionKey, args, expected) {
  try {
    const result = functions.get(functionKey).execute(...args);

    const isClose =
      typeof result === "number" && typeof expected === "number"
        ? Math.abs(result - expected) < 1e-10
        : result === expected;

    console.log("====================================");
    console.log("Function Test:", name);
    console.log("Expected:", expected);
    console.log("Result  :", result);
    console.log(isClose ? "✅ PASS" : "❌ FAIL");
  } catch (err) {
    console.log("====================================");
    console.log("Function Test:", name);
    console.log("Expected:", expected);
    console.log("Result  : ERROR ->", err.message);
    console.log(expected === "ERROR" ? "✅ PASS" : "❌ FAIL");
  }
}

// ===============================
// BASIC OPERATOR TESTS
// ===============================

runOperatorTest("Addition", "+", [5, 3], 8);
runOperatorTest("Subtraction", "-", [5, 3], 2);
runOperatorTest("Multiplication", "*", [5, 3], 15);
runOperatorTest("Power", "^", [2, 3], 8);
runOperatorTest("Negation", "NEG", [5], -5);

// ===============================
// DIVISION TESTS
// ===============================

runOperatorTest("Division", "/", [10, 2], 5);
runOperatorTest("Divide by Zero", "/", [10, 0], "ERROR");

// ===============================
// FACTORIAL TESTS
// ===============================

runOperatorTest("Factorial 5", "!", [5], 120);
runOperatorTest("Factorial 1", "!", [1], 1);
runOperatorTest("Factorial 0", "!", [0], 1);

// ===============================
// TRIG FUNCTION TESTS (Radians)
// ===============================

runFunctionTest("Sin(0)", "sin", [0], 0);
runFunctionTest("Cos(0)", "cos", [0], 1);
runFunctionTest("Tan(PI/4)", "tan", [Math.PI / 4], 1);
runFunctionTest("Tan(PI/2)", "tan", [Math.PI / 2], "ERROR");

// ===============================
// LOG TESTS
// ===============================

runFunctionTest("log10(100)", "log", [100], 2);
runFunctionTest("log10(0)", "log", [0], "ERROR");

// ===============================
// NATURAL LOG TEST
// ===============================

runFunctionTest("ln(e)", "ln", [Math.E], 1);

// ===============================
// SQUARE ROOT TESTS
// ===============================

runFunctionTest("sqrt(25)", "sqr-root", [25], 5);
runFunctionTest("sqrt(-4)", "sqr-root", [-4], "ERROR");

// ===============================
// EXTRA EDGE CASE TESTS
// ===============================

runOperatorTest("Power negative", "^", [-2, 3], -8);
runOperatorTest("Power fractional", "^", [9, 0.5], 3);
