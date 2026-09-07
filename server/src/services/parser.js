'use strict';

// Parser: converts a stream of lexical tokens into Reverse Polish Notation (RPN)
// using a shunting-yard style algorithm. Validates structure and prepares tokens for evaluation.
class Parser {
  // Keep references to operator, function and constant maps plus a Stack constructor.
  constructor(operators, functions, constants, Stack) {
    this.operators = operators;
    this.functions = functions;
    this.constants = constants;
    this.Stack = Stack;
  }

  // Convert an array of tokens into an RPN output array.
  // Throws on malformed input (missing operands, unknown token types, mismatched brackets).
  parse(tokens) {
    this.output = [];
    this.stack = new this.Stack();

    const expectOperand = { value: true };
    if (!tokens) {
      throw new Error('Parser : Input tokens can not be zero');
    }
    for (const token of tokens) {
      switch (token.type) {
        case 'OPERATOR':
          this.#handleOperator(token, expectOperand);
          break;
        case 'FUNCTION':
          this.#handleFunction(token, expectOperand);
          break;
        case 'NUMBER':
          this.#handleNumber(token, expectOperand);
          break;
        case 'CONSTANT':
          this.#handleConstant(token, expectOperand);
          break;
        case 'BRACKET':
          this.#handleBracket(token, expectOperand);
          break;
        default:
          throw new Error('Parser : Token type not available');
      }
    }
    while (!this.stack.isEmpty()) {
      const top = this.stack.pop();
      if (top.type === 'BRACKET') {
        throw new Error('Parser : Invalid Bracket Expression');
      }
      this.output.push(top);
    }

    if (expectOperand.value) {
      throw new Error('Parser : Operand expected');
    }
    if (this.output.length === 0) {
      throw new Error('Parser : Empty expression');
    }
    return this.output;
  }

  // Handle operator tokens: enforce operand expectations and manage stack according to
  // operator precedence and associativity before pushing the incoming operator.
  #handleOperator(token, expectOperand) {
    if (
      token.value !== 'NEG' &&
      token.value !== 'PLUS' &&
      expectOperand.value
    ) {
      throw new Error('Parser : Operand expected');
    }
    if (token.value !== '!') {
      expectOperand.value = true;
    }

    if (this.stack.isEmpty()) {
      this.stack.push(token);
      return;
    }
    const operator = this.operators.get(token.value);
    let topToken = this.stack.peek();
    let top = this.#definitionFor(topToken);
    while (
      !this.stack.isEmpty() &&
      this.stack.peek().type !== 'BRACKET' &&
      this.#shouldPop(top, operator)
    ) {
      this.output.push(this.stack.pop());
      if (!this.stack.isEmpty()) {
        topToken = this.stack.peek();
        top = this.#definitionFor(topToken);
      }
    }
    this.stack.push(token);
    return;
  }

  // Handle function tokens: push the function token onto the stack and expect its argument next.
  #handleFunction(token, expectOperand) {
    expectOperand.value = true;
    this.stack.push(token);
    return;
  }

  // Handle numeric tokens: append the number to output and mark that an operand has been provided.
  #handleNumber(token, expectOperand) {
    expectOperand.value = false;
    this.output.push(token);
  }

  // Handle constant tokens: append the constant token to output and mark operand satisfied.
  #handleConstant(token, expectOperand) {
    expectOperand.value = false;
    this.output.push(token);
  }

  // Handle bracket tokens: push '(' onto the stack or pop until matching '(' on ')'.
  // Throws if no matching opening bracket is found.
  #handleBracket(token, expectOperand) {
    if (token.value === '(') {
      expectOperand.value = true;
      this.stack.push(token);
    } else {
      expectOperand.value = false;
      while (this.stack.peek().type !== 'BRACKET') {
        this.output.push(this.stack.pop());
        if (this.stack.isEmpty()) {
          throw new Error('Parser : Invalid Bracket Expression');
        }
      }
      this.stack.pop();
    }
  }

  // Decide whether the operator/function on top of the stack should be popped before
  // pushing the incoming operator, based on precedence and associativity rules.
  #shouldPop(top, operator) {
    if (top.precedence > operator.precedence) {
      return true;
    } else if (top.precedence < operator.precedence) {
      return false;
    } else {
      if (operator.associativity === 'right') {
        return false;
      }
      return true;
    }
  }

  #definitionFor(token) {
    if (!token) {
      return undefined;
    }
    if (token.type === 'OPERATOR') {
      return this.operators.get(token.value);
    }
    return this.functions.get(token.value);
  }
}

module.exports = Parser;
