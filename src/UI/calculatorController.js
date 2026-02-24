import Calculator from "../calculator/calculator.js";
import Evaluator from "../calculator/evaluator.js";
import Parser from "../calculator/parser.js";
import Tokenizer from "../calculator/tokenizer.js";
import { operators, functions, constants } from "../calculator/operations.js";
import Stack from "../utils/stack.js";
const calculator = new Calculator(
  Evaluator,
  Parser,
  Tokenizer,
  Stack,
  operators,
  functions,
  constants,
  15,
);
