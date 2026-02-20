// 5 1 2 + 4 * + 3 -
// 6 2 / 3 ^
// 2 3 4 + *
// 5 !
// 3 2 ^ 4 1 - * +
// 2 root
// 90 sin
// 60 cos *
// 45 tan +
// 10 log
// 2.718281828 ln +
// 1 3 / +
// 7 1/x +
// *
// +
// -

import Stack from "../utils/stack.js";

// 5 1 2 + 4 * + 3 - 6 2 / 3 ^ 2 3 4 + * 5 ! 3 2 ^ 4 1 - * + 2 root 90 sin 60 cos * 45 tan + 10 log 2.718281828 ln + 1 3 / + 7 1/x + * + -

export default class Evaluator {
  constructor(operators, functions, constants, precision = 10) {
    this.operators = operators;
    this.functions = functions;
    this.constants = constants;
    this.precision = precision;
  }
  evaluate(postfix) {
    this.stack = new Stack();
    if (!postfix) {
      throw new Error("Evaluation : empty postfix expression");
    }
    for (const token of postfix) {
      switch (token.type) {
        case "OPERATOR":
          this.handle_operator(token);
          break;
        case "FUNCTION":
          this.handle_function(token);
          break;
        case "NUMBER":
          this.handle_number(token);
          break;
        case "CONSTANT":
          this.handle_constant(token);
          break;
        default:
          break;
      }
    }
    if (this.stack.size() !== 1) {
      throw new Error("Evaluation : Invalid PostFix Expression");
    }
    return this.stack.pop();
  }
  handle_operator(token) {
    if (this.stack.isEmpty()) {
      throw new Error("Evaluation op: Invalid PostFix Ecpression");
    }

    const operator = this.operators.get(token.value);

    if (this.stack.size() < operator.arity) {
      throw new Error("Evaluation op: Invalid PostFix Expression");
    }
    const operands = [];
    for (let i = 0; i < operator.arity; i++) {
      operands.unshift(this.stack.pop());
    }

    const answer = operator.execute(...operands);
    this.stack.push(Number(answer.toFixed(this.precision)));
  }
  handle_function(token) {
    if (this.stack.isEmpty()) {
      throw new Error("Evaluation fn: Invalid PostFix Ecpression");
    }
    const function_op = this.functions.get(token.value);
    if (this.stack.size() < function_op.arity) {
      throw new Error("Evaluation fn: Invalid PostFix Expression");
    }
    const operands = [];
    for (let i = 0; i < function_op.arity; i++) {
      operands.unshift(this.stack.pop());
    }
    const answer = function_op.execute(...operands);
    this.stack.push(Number(answer.toFixed(this.precision)));
  }
  handle_number(token) {
    this.stack.push(Number(token.value.toFixed(this.precision)));
  }
  handle_constant(token) {
    this.stack.push(
      Number(this.constants.get(token.value).toFixed(this.precision)),
    );
  }
}
