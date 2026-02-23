import Stack from "../utils/stack.js";

// Example of Token Sequence.
// { type: "CONSTANT", value: "E" },
// { type: "FUNCTION", value: "ln" },

class Parser {
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
          this.#handle_operator(token);
          break;
        case "FUNCTION":
          this.#handle_function(token);
          break;
        case "NUMBER":
          this.#handle_number(token);
          break;
        case "CONSTANT":
          this.#handle_constant(token);
          break;
        default:
          throw new Error("Parser : Token type not available");
          break;
      }
    }
  }
  #handle_operator(token) {}
  #handle_function(token) {}
  #handle_number(token) {}
  #handle_constant(token) {}
}
