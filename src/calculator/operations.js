const operators = new Map([
  [
    "+",
    {
      lexerString: "+",
      tokenString: "+",
      precedence: 1,
      associativity: "left",
      arity: 2,
      execute: (a, b) => a + b,
    },
  ],
  [
    "-",
    {
      lexerString: "-",
      tokenString: "-",
      precedence: 1,
      associativity: "left",
      arity: 2,
      execute: (a, b) => a - b,
    },
  ],
  [
    "*",
    {
      lexerString: "*",
      tokenString: "*",
      precedence: 2,
      associativity: "left",
      arity: 2,
      execute: (a, b) => a * b,
    },
  ],
  [
    "/",
    {
      lexerString: "/",
      tokenString: "/",
      precedence: 2,
      associativity: "left",
      arity: 2,
      execute: (a, b) => {
        if (b === 0) {
          throw new Error("Operator / : Devide by Zero not allowed");
        }
        return a / b;
      },
    },
  ],
  [
    "%",
    {
      lexerString: "%",
      tokenString: "%",
      precedence: 2,
      associativity: "left",
      arity: 2,
      execute: (a, b) => a % b,
    },
  ],
  [
    "^",
    {
      lexerString: "^",
      tokenString: "^",
      precedence: 3,
      associativity: "right",
      arity: 2,
      execute: (a, b) => Math.pow(a, b),
    },
  ],
  [
    "NEG",
    {
      lexerString: "-",
      tokenString: "NEG",
      precedence: 4,
      associativity: "right",
      arity: 1,
      execute: (a) => -a,
    },
  ],
  [
    "!",
    {
      lexerString: "!",
      tokenString: "!",
      precedence: 5,
      associativity: "left",
      arity: 1,
      execute: (a) => factorial(a),
    },
  ],
]);
const functions = new Map([
  [
    "sin",
    {
      lexerString: "sin",
      tokenString: "sin",
      precedence: 6,
      arity: 1,
      execute: (x) => Math.sin(x),
    },
  ],
  [
    "cos",
    {
      lexerString: "cos",
      tokenString: "cos",
      precedence: 6,
      arity: 1,
      execute: (x) => Math.cos(x),
    },
  ],
  [
    "tan",
    {
      lexerString: "tan",
      tokenString: "tan",
      precedence: 6,
      arity: 1,
      execute: (x) => {
        const epsilon = 1e-12;

        if (Math.abs(Math.cos(x)) < epsilon) {
          throw new Error("Operator Tan : Math Error");
        }

        return Math.tan(x);
      },
    },
  ],
  [
    "log",
    {
      lexerString: "log",
      tokenString: "log",
      precedence: 6,
      arity: 1,
      execute: (x) => {
        if (x <= 0) {
          throw new Error(
            "Operator Log : Values <= 0 not allowed in Log operator",
          );
        }
        return Math.log10(x);
      },
    },
  ],
  [
    "ln",
    {
      lexerString: "ln",
      tokenString: "ln",
      precedence: 6,
      arity: 1,
      execute: (x) => {
        if (x <= 0) {
          throw new Error(
            "Operator Ln : Values <= 0 not allowed in Ln operator",
          );
        }
        return Math.log(x);
      },
    },
  ],
  [
    "sqr-root",
    {
      lexerString: "√",
      tokenString: "sqr-root",
      precedence: 6,
      arity: 1,
      execute: (x) => {
        if (x < 0) {
          throw new Error(
            "Operator sqrt : Negative values inside squre root not allowed",
          );
        }
        return Math.sqrt(x);
      },
    },
  ],
]);
const constants = new Map([
  ["PI", { value: Math.PI, lexerString: "π", tokenString: "PI" }],
  ["E", { value: Math.E, lexerString: "e", tokenString: "E" }],
]);

function factorial(n) {
  if (n <= 1) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}

export { operators, functions, constants };
