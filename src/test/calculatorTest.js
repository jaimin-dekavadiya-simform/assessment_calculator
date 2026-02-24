import Calculator from "../calculator/calculator.js";
import Evaluator from "../calculator/evaluator.js";
import Parser from "../calculator/parser.js";
import Tokenizer from "../calculator/tokenizer.js";
import { operators, functions, constants } from "../calculator/operations.js";

const calculator = new Calculator(
  Evaluator,
  Parser,
  Tokenizer,
  operators,
  functions,
  constants,
  15,
);

// ===========================================
// TEST RUNNER FOR calculator.calculate(expr)
// ===========================================

const EPS = 1e-12;

function almostEqual(a, b, eps = EPS) {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

function runCalcTest(name, expr, expected) {
  try {
    const result = calculator.calculate(expr);
    const pass =
      expected === "ERROR" ? false : almostEqual(result, expected, EPS);

    console.log("====================================");
    console.log("Test:", name);
    console.log("Expr:", expr);
    console.log("Expected:", expected);
    console.log("Result  :", result);
    console.log(pass ? "✅ PASS" : "❌ FAIL");
  } catch (err) {
    console.log("====================================");
    console.log("Test:", name);
    console.log("Expr:", expr);
    console.log("Expected:", expected);
    console.log("Result  : ERROR ->", err.message);
    console.log(expected === "ERROR" ? "✅ PASS" : "❌ FAIL");
  }
}

// ===========================================
// CALL TESTS (Calculator: string → number)
// ===========================================

// ---------- Basic Arithmetic & Precedence ----------
runCalcTest("1) 3 + 4", "3 + 4", 7);
runCalcTest("2) 3 + 4 * 2", "3 + 4 * 2", 11);
runCalcTest("3) (3 + 4) * 2", "(3 + 4) * 2", 14);
runCalcTest(
  "4) 3 + 4 * 2 / (1 - 5)",
  "3 + 4 * 2 / (1 - 5)",
  3 + (4 * 2) / (1 - 5),
);
runCalcTest(
  "5) (1 + 2) * (3 + 4) / (5 - 6/3)",
  "(1 + 2) * (3 + 4) / (5 - 6/3)",
  ((1 + 2) * (3 + 4)) / (5 - 6 / 3),
);

// ---------- Exponentiation & Associativity ----------
runCalcTest("6) 2 ^ 3 ^ 2 (right-assoc)", "2 ^ 3 ^ 2", 2 ** (3 ** 2));
runCalcTest("7) (2 ^ 3) ^ 2", "(2 ^ 3) ^ 2", (2 ** 3) ** 2);
runCalcTest("8) 2 ^ 3 * 4", "2 ^ 3 * 4", 2 ** 3 * 4);
runCalcTest("9) 2 * 3 ^ 4", "2 * 3 ^ 4", 2 * 3 ** 4);
runCalcTest("10) 3 - 2 - 1 (left-assoc minus)", "3 - 2 - 1", 0);

// ---------- Constants (π, e) ----------
runCalcTest("11) e ^ π", "e ^ π", Math.E ** Math.PI);
runCalcTest("12) π ^ 2 + e", "π ^ 2 + e", Math.PI ** 2 + Math.E);
runCalcTest("13) 2 * π", "2 * π", 2 * Math.PI);
runCalcTest("14) 3 * e ^ 2", "3 * e ^ 2", 3 * Math.E ** 2);

// ---------- Functions WITH parentheses (radians) ----------
runCalcTest("15) sin(π/6)", "sin(π/6)", Math.sin(Math.PI / 6));
runCalcTest("16) cos(π)", "cos(π)", Math.cos(Math.PI));
runCalcTest("17) tan(π/4)", "tan(π/4)", Math.tan(Math.PI / 4));
runCalcTest("18) ln(e^2)", "ln(e^2)", Math.log(Math.E ** 2));
runCalcTest(
  "19) log(1000)",
  "log(1000)",
  Math.log10 ? Math.log10(1000) : Math.log(1000) / Math.LN10,
);
runCalcTest("20) √(2 + 3)", "√(2 + 3)", Math.sqrt(5));

// ---------- Functions WITHOUT parentheses ----------
runCalcTest("22) sin π", "sin π", Math.sin(Math.PI));
runCalcTest("23) ln e", "ln e", Math.log(Math.E));
runCalcTest("24) √ 9", "√ 9", Math.sqrt(9));
runCalcTest("25) cos 0", "cos 0", Math.cos(0));
runCalcTest(
  "26) sin cos π  → sin(cos(π))",
  "sin cos π",
  Math.sin(Math.cos(Math.PI)),
);
runCalcTest("27) ln √ 16 → ln(√(16))", "ln √ 16", Math.log(Math.sqrt(16)));
runCalcTest("28) √ ln e  → √(ln(e))", "√ ln e", Math.sqrt(Math.log(Math.E)));

// ---------- Composition & Mixed Expressions ----------
runCalcTest(
  "29) sin(cos(π/3))",
  "sin(cos(π/3))",
  Math.sin(Math.cos(Math.PI / 3)),
);
runCalcTest(
  "30) sin(π/3) * ln(e^5)",
  "sin(π/3) * ln(e^5)",
  Math.sin(Math.PI / 3) * Math.log(Math.E ** 5),
);
// (changed to explicit multiplication)
runCalcTest(
  "31) (3 * π + e^2) / 5",
  "(3 * π + e^2) / 5",
  (3 * Math.PI + Math.E ** 2) / 5,
);
// (changed to explicit multiplication)
runCalcTest(
  "32) (2 * e^(π/2)) / √(π)",
  "(2 * e^(π/2)) / √(π)",
  (2 * Math.E ** (Math.PI / 2)) / Math.sqrt(Math.PI),
);
runCalcTest(
  "33) tan(π/8) + cos(π/5)",
  "tan(π/8) + cos(π/5)",
  Math.tan(Math.PI / 8) + Math.cos(Math.PI / 5),
);
runCalcTest(
  "34) (π^3 - 10)^(1/3)",
  "(π^3 - 10)^(1/3)",
  (Math.PI ** 3 - 10) ** (1 / 3),
);

runCalcTest(
  "40) sin ln e → sin(ln(e))",
  "sin ln e",
  Math.sin(Math.log(Math.E)),
);

// ---------- Edge cases (domain boundaries / tricky) ----------

runCalcTest("42) ln(1)", "ln(1)", Math.log(1));
runCalcTest("43) log(1)", "log(1)", Math.log10 ? Math.log10(1) : 0);
runCalcTest("44) √(0)", "√(0)", Math.sqrt(0));

runCalcTest("46) sin(0)", "sin(0)", Math.sin(0));
runCalcTest("47) cos(0)", "cos(0)", Math.cos(0));
runCalcTest("48) ln(e^0)", "ln(e^0)", Math.log(Math.E ** 0));

// ---------- Whitespace, formatting robustness ----------
runCalcTest(
  "49) Extra spaces",
  "   sin(  π  /  6   )  ",
  Math.sin(Math.PI / 6),
);
runCalcTest("50) Tabs/newlines", "\n\tcos(\nπ\t)\n", Math.cos(Math.PI));

// ---------- Functions without parens in complex combos ----------
runCalcTest(
  "51) √  (  2  ) + sin π",
  "√  (  2  ) + sin π",
  Math.sqrt(2) + Math.sin(Math.PI),
);
runCalcTest(
  "52) ln e + cos π",
  "ln e + cos π",
  Math.log(Math.E) + Math.cos(Math.PI),
);
runCalcTest(
  "53) sin cos ln e",
  "sin cos ln e",
  Math.sin(Math.cos(Math.log(Math.E))),
);

// ---------- Former implicit multiplication tests — now explicit '*' ----------
runCalcTest("54) 2 * π (explicit)", "2 * π", 2 * Math.PI);
runCalcTest("55) 3 * (π) (explicit)", "3 * (π)", 3 * Math.PI);
runCalcTest("56) (1+2) * (3+4) (explicit)", "(1+2) * (3+4)", (1 + 2) * (3 + 4));

// ---------- Error Cases (should throw) ----------
runCalcTest("E1) Mismatched bracket (missing ')')", "(3 + 4", "ERROR");
runCalcTest("E2) Extra closing bracket", "3 + 4)", "ERROR");
runCalcTest("E3) Incomplete: 3 +", "3 +", "ERROR");
runCalcTest("E4) Two operators in a row", "3 * * 4", "ERROR");
runCalcTest("E5) Function with empty args", "sin()", "ERROR");
runCalcTest("E6) Function name only", "sin", "ERROR");
runCalcTest("E7) Empty parentheses", "()", "ERROR");
runCalcTest("E8) Starts with operator", "+ 3 4", "ERROR");
runCalcTest("E9) Adjacent numbers w/o operator", "2 3", "ERROR");
runCalcTest("E10) Dangling function then operator", "cos + 1", "ERROR");

// ---------- Optional unary minus suite (enable if your parser supports unary '-') ----------
runCalcTest("U1) -3", "-3", -3);
runCalcTest("U2) - (3)", "-(3)", -3);
runCalcTest("U3) -3^2  (usually = -(3^2) = -9)", "-3^2", -(3 ** 2));
runCalcTest("U4) (-3)^2 (= 9)", "(-3)^2", (-3) ** 2);
runCalcTest("U5) sin(-π/6)", "sin(-π/6)", Math.sin(-Math.PI / 6));
runCalcTest("U6) -sin(π/6)", "-sin(π/6)", -Math.sin(Math.PI / 6));

// ---------- Final sanity ----------
runCalcTest(
  "Z1) Complex mix",
  " ( 2 * e^(π/2) ) / √(π) + sin(π/3) * ln(e^5) - cos(2*π) ",
  (2 * Math.E ** (Math.PI / 2)) / Math.sqrt(Math.PI) +
    Math.sin(Math.PI / 3) * Math.log(Math.E ** 5) -
    Math.cos(2 * Math.PI),
);

// Example from your snippet (should print ~0.5):
try {
  const result = calculator.calculate(` sin(π/6)  `);
  console.log("Manual example:", result);
} catch (e) {
  console.error(e);
}
