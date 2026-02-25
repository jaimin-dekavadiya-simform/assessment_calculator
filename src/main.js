import CalculatorController from "./UI/calculatorController.js";
import Calculator from "./calculator/calculator.js";
import Evaluator from "./calculator/evaluator.js";
import Parser from "./calculator/parser.js";
import Tokenizer from "./calculator/tokenizer.js";
import { operators, functions, constants } from "./calculator/operations.js";
import Stack from "./utils/stack.js";
import History from "./calculator/history.js";
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

const view = document.getElementsByClassName("container")[0];

const calculatorController = new CalculatorController(
  Stack,
  History,
  calculator,
  view,
);
