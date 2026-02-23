import Stack from "../utils/stack.js";

export default class Parser {
  constructor(operators, functions, constants) {
    this.operators = operators;
    this.functions = functions;
    this.constants = constants;
  }
  parse(tokens) {
    this.output = [];
    this.stack = new Stack();
    if (!tokens) {
      throw new Error("Parser : Input tokens can not be zero");
    }
    for (const token of tokens) {
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
        case "BRACKET":
          this.#handleBracket(token);
          break;
        default:
          throw new Error("Parser : Token type not available");
          break;
      }
    }
    while (!this.stack.isEmpty()) {
      let top = this.stack.pop();
      if (top.type === "BRACKET") {
        throw new Error("Parser : Invalid Bracket Expression");
      }
      this.output.push(top);
    }
    return this.output;
  }
  #handleOperator(token) {
    if (this.stack.isEmpty()) {
      this.stack.push(token);
      return;
    }
    const operator = this.operators.get(token.value);
    let top_token = this.stack.peek();
    let top =
      top_token.type === "OPERATOR"
        ? this.operators.get(top_token.value)
        : this.functions.get(top_token.value);
    while (
      !this.stack.isEmpty() &&
      this.stack.peek().type !== "BRACKET" &&
      this.#shouldPop(top, operator)
    ) {
      this.output.push(this.stack.pop());
      if (!this.stack.isEmpty()) {
        top = this.operators.get(this.stack.peek().value);
      }
    }
    this.stack.push(token);
    return;
  }
  #handleFunction(token) {
    this.stack.push(token);
    return;
  }
  #handleNumber(token) {
    this.output.push(token);
  }
  #handleConstant(token) {
    this.output.push(token);
  }
  #handleBracket(token) {
    if (token.value === "(") {
      this.stack.push(token);
    } else {
      while (this.stack.peek().type !== "BRACKET") {
        this.output.push(this.stack.pop());
        if (this.stack.isEmpty()) {
          throw new Error("Parser  : Invalid Bracket Expression");
        }
      }
      this.stack.pop();
    }
  }
  #shouldPop(top, operator) {
    if (top.precedence > operator.precedence) {
      return true;
    } else if (top.precedence < operator.precedence) {
      return false;
    } else {
      if (operator.associativity === "right") {
        return false;
      }
      return true;
    }
  }
}
