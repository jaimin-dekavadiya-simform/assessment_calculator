import { operators, functions } from "../calculator/operations.js";

// ===== BASIC OPERATOR TESTS =====

console.log("Addition:", operators.get("+").execute(5, 3)); // 8
console.log("Subtraction:", operators.get("-").execute(5, 3)); // 2
console.log("Multiplication:", operators.get("*").execute(5, 3)); // 15
console.log("Power:", operators.get("^").execute(2, 3)); // 8
console.log("Negation:", operators.get("NEG").execute(5)); // -5

// ===== DIVISION TESTS =====

console.log("Division:", operators.get("/").execute(10, 2)); // 5

try {
  console.log("Divide by Zero:", operators.get("/").execute(10, 0));
  s;
} catch (e) {
  console.log("Expected Divide Error:", e.message);
}

// ===== FACTORIAL TESTS =====

console.log("Factorial 5:", operators.get("!").execute(5)); // 120
console.log("Factorial 1:", operators.get("!").execute(1)); // 1
console.log("Factorial 0:", operators.get("!").execute(0)); // 1

// ===== TRIG FUNCTION TESTS (Radians) =====

console.log("Sin(0):", functions.get("sin").execute(0)); // 0
console.log("Cos(0):", functions.get("cos").execute(0)); // 1
console.log("Tan(π/4):", functions.get("tan").execute(Math.PI / 4)); // ~1

try {
  console.log("Tan(π/2):", functions.get("tan").execute(Math.PI / 2));
} catch (e) {
  console.log("Expected Tan Error:", e.message);
}

// ===== LOG TESTS =====

console.log("log10(100):", functions.get("log").execute(100)); // 2

try {
  console.log(functions.get("log").execute(0));
} catch (e) {
  console.log("Expected Log Error:", e.message);
}

// ===== NATURAL LOG TEST =====

console.log("ln(e):", functions.get("ln").execute(Math.E)); // 1

// ===== SQUARE ROOT TESTS =====

console.log("sqrt(25):", functions.get("sqr-root").execute(25)); // 5

try {
  console.log(functions.get("sqr-root").execute(-4));
} catch (e) {
  console.log("Expected sqrt Error:", e.message);
}

// ===== EXTRA EDGE CASE TESTS =====

console.log("Power negative:", operators.get("^").execute(-2, 3)); // -8
console.log("Power fractional:", operators.get("^").execute(9, 0.5)); // 3
