'use strict';

const AppError = require('../utils/AppError');
const Tokenizer = require('./tokenizer');
const Parser = require('./parser');
const Evaluator = require('./evaluator');
const Stack = require('./stack');
const { operators, functions, constants } = require('./operations');
const { factorial: factorialCore } = require('./uitls');

const PRECISION = 15;

function mathError(message) {
  return new AppError(message, 400, 'MATH_ERROR');
}

function invalidExpressionError(message) {
  return new AppError(message, 400, 'INVALID_EXPRESSION');
}

function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  if (b === 0) {
    throw mathError('Division by zero is not allowed');
  }
  return a / b;
}

function modulo(a, b) {
  if (b === 0) {
    throw mathError('Modulo by zero is not allowed');
  }
  return a % b;
}

function power(a, b) {
  return Math.pow(a, b);
}

function sqrt(x) {
  if (x < 0) {
    throw mathError('Square root of a negative number is not allowed');
  }
  return Math.sqrt(x);
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) {
    throw mathError('Factorial requires a non-negative integer');
  }
  return factorialCore(n);
}

function calculate(expression) {
  let postfix;
  try {
    const tokenizer = new Tokenizer(operators, functions, constants);
    const tokens = tokenizer.tokenize(expression);
    const parser = new Parser(operators, functions, constants, Stack);
    postfix = parser.parse(tokens);
  } catch (error) {
    throw invalidExpressionError(error.message);
  }

  let result;
  try {
    const evaluator = new Evaluator(operators, functions, constants, Stack, PRECISION);
    result = evaluator.evaluate(postfix);
  } catch (error) {
    throw mathError(error.message);
  }

  if (!Number.isFinite(result)) {
    throw mathError('Calculation produced a non-finite result');
  }

  return result;
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  modulo,
  power,
  sqrt,
  factorial,
  calculate,
};
