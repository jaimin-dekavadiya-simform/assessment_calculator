export default class Evaluator {
  constructor(operators, functions, constants, Stack, precision) {
    this.operators = operators;
    this.functions = functions;
    this.constants = constants;
    this.precision = precision;
    this.Stack = Stack;
  }
  evaluate(postfix) {
    this.stack = new this.Stack();
    if (!postfix) {
      throw new Error("Evaluation : empty postfix expression");
    }
    for (const token of postfix) {
      switch (token.type) {
        case "OPERATOR":
          this.#handleOperator(token);
          break;
        case "FUNCTION":
          this.#handleFunction(token);
          break;
        case "NUMBER":
          this.#handleNumber(token);
          break;
        case "CONSTANT":
          this.#handleConstant(token);
          break;
        default:
          throw new Error("Evaluation : Token type not available");
          break;
      }
    }
    if (this.stack.size() !== 1) {
      throw new Error("Evaluation : Invalid PostFix Expression");
    }
    return this.stack.pop();
  }
  #handleOperator(token) {
    if (this.stack.isEmpty()) {
      throw new Error("Evaluation op: Invalid PostFix Expression 1");
    }

    const operator = this.operators.get(token.value);

    if (this.stack.size() < operator.arity) {
      throw new Error("Evaluation op: Invalid PostFix Expression 2");
    }
    const operands = [];
    for (let i = 0; i < operator.arity; i++) {
      operands.unshift(this.stack.pop());
    }

    const answer = operator.execute(...operands);
    this.stack.push(Number(answer.toFixed(this.precision)));
  }
  #handleFunction(token) {
    if (this.stack.isEmpty()) {
      throw new Error("Evaluation fn: Invalid PostFix Exression 3");
    }
    const function_op = this.functions.get(token.value);
    if (this.stack.size() < function_op.arity) {
      throw new Error("Evaluation fn: Invalid PostFix Expression 4");
    }
    const operands = [];
    for (let i = 0; i < function_op.arity; i++) {
      operands.unshift(this.stack.pop());
    }
    const answer = function_op.execute(...operands);
    this.stack.push(Number(answer.toFixed(this.precision)));
  }
  #handleNumber(token) {
    this.stack.push(Number(token.value.toFixed(this.precision)));
  }
  #handleConstant(token) {
    this.stack.push(
      Number(this.constants.get(token.value).value.toFixed(this.precision)),
    );
  }
}
