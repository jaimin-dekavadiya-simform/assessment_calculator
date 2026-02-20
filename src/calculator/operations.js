const operators = new Map([
  [
    "+",
    {
      precedence: 1,
      associativity: "left",
      arity: 2,
      execute: (a, b) => a + b,
    },
  ],
  [
    "-",
    {
      precedence: 1,
      associativity: "left",
      arity: 2,
      execute: (a, b) => a - b,
    },
  ],
  [
    "*",
    {
      precedence: 2,
      associativity: "left",
      arity: 2,
      execute: (a, b) => a * b,
    },
  ],
  [
    "/",
    {
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
    "^",
    {
      precedence: 3,
      associativity: "right",
      arity: 2,
      execute: (a, b) => Math.pow(a, b),
    },
  ],
  [
    "NEG",
    {
      precedence: 4,
      associativity: "right",
      arity: 1,
      execute: (a) => -a,
    },
  ],
  [
    "!",
    {
      precedence: 5,
      associativity: "left",
      arity: 1,
      execute: (a) => factorial(a),
    },
  ],
]);

const functions = new Map([
  ["sin", { arity: 1, execute: (x) => Math.sin(x) }],
  ["cos", { arity: 1, execute: (x) => Math.cos(x) }],
  [
    "tan",
    {
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

function factorial(n) {
  if (n <= 1) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}

export { operators, functions };
