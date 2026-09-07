'use strict';

// Recognizes numbers, operators, parentheses, functions and constants based on provided maps.
class Tokenizer {
  // Store operator/function/constant definitions (arrays derived from Maps).
  constructor(operators, functions, constants) {
    this.operators = [...operators.values()];
    this.functions = [...functions.values()];
    this.constants = [...constants.values()];
  }

  // Tokenize the input string into an ordered array of tokens.
  // Skips whitespace and applies multiple matchers in order; throws on invalid input.
  tokenize(str) {
    if (str.length === 0) {
      throw new Error('Lexer : can not tokenize empty string');
    }
    const tokens = [];
    const matchers = [
      this.#readNumber,
      this.#readOperator,
      this.#readParenthesis,
      this.#readFunction,
      this.#readConstant,
    ];
    let functionCounter = { value: 0 };
    let index = 0;
    while (index < str.length) {
      let accepted = false;
      if (str[index] === ' ' || str[index] === '\n' || str[index] === '\t') {
        index++;
        continue;
      }
      for (const matcher of matchers) {
        const res = matcher.call(this, str, index, tokens);
        if (res.accepted) {
          this.#rejectImplicitMultiplication(res, tokens);

          tokens.push({ type: res.type, value: res.value });
          index = res.newIndex;
          accepted = true;
          this.#implicitAfter(res, tokens, functionCounter, str);

          break;
        }
      }

      if (!accepted) {
        throw new Error('Lexer : Invalid Input');
      }
    }

    return tokens;
  }

  // Reject implicit multiplication instead of silently inserting "*".
  // A NUMBER/CONSTANT/")" immediately followed by a NUMBER/CONSTANT/"(" is
  // a structural error rather than an implicit product.
  #rejectImplicitMultiplication(res, tokens) {
    if (
      res.type === 'CONSTANT' ||
      res.type === 'NUMBER' ||
      (res.type === 'BRACKET' && res.value === '(')
    ) {
      const lastToken = tokens[tokens.length - 1];

      if (
        lastToken?.type === 'NUMBER' ||
        lastToken?.type === 'CONSTANT' ||
        (lastToken?.type === 'BRACKET' && lastToken?.value === ')')
      ) {
        throw new Error('Lexer : Implicit multiplication not allowed');
      }
    }
  }

  // Close any pending implicit function calls after reading a number/constant.
  // When a FUNCTION matcher is accepted and it is not followed by an explicit
  // "(", we insert an implicit "(" and increment a counter. When a
  // NUMBER/CONSTANT follows, we flush the corresponding ")" tokens.
  #implicitAfter(res, tokens, functionCounter, str) {
    if (res.type === 'FUNCTION') {
      if (this.#nextNonWhitespace(str, res.newIndex) !== '(') {
        tokens.push({ type: 'BRACKET', value: '(' });
        functionCounter.value++;
      }
    } else if (res.type === 'NUMBER' || res.type === 'CONSTANT') {
      while (functionCounter.value !== 0) {
        functionCounter.value--;
        tokens.push({ type: 'BRACKET', value: ')' });
      }
    }
  }

  // Return the next non-whitespace character starting at startIndex.
  #nextNonWhitespace(str, startIndex) {
    let i = startIndex;
    while (i < str.length) {
      if (str[i] !== ' ' && str[i] !== '\n' && str[i] !== '\t') {
        return str[i];
      }
      i++;
    }
    return undefined;
  }

  // Read a contiguous number (supports a single decimal point). Throws on malformed numbers.
  #readNumber(str, startIndex) {
    let i = startIndex;
    let decimalFlag = false;
    while (i < str.length && (this.#isDigit(str[i]) || str[i] === '.')) {
      if (str[i] === '.') {
        if (decimalFlag) {
          throw new Error('Lexer : Number Format not allowed');
        }
        decimalFlag = true;
        i++;
      } else {
        i++;
      }
    }
    if (i === startIndex) {
      return { accepted: false };
    }
    return {
      accepted: true,
      type: 'NUMBER',
      newIndex: i,
      value: Number(str.slice(startIndex, i)),
    };
  }

  // Read an operator. Special-case "-" to distinguish unary (NEG) vs binary "-".
  // For other operators, match by lexerString and return the normalized tokenString.
  #readOperator(str, startIndex, tokens) {
    if (str[startIndex] === '-') {
      if (this.#isNegative(tokens)) {
        return {
          accepted: true,
          type: 'OPERATOR',
          value: 'NEG',
          newIndex: startIndex + 1,
        };
      }
      return {
        accepted: true,
        type: 'OPERATOR',
        value: '-',
        newIndex: startIndex + 1,
      };
    }
    if (str[startIndex] === '+') {
      if (this.#isNegative(tokens)) {
        return {
          accepted: true,
          type: 'OPERATOR',
          value: 'PLUS',
          newIndex: startIndex + 1,
        };
      }
      return {
        accepted: true,
        type: 'OPERATOR',
        value: '+',
        newIndex: startIndex + 1,
      };
    }

    for (const operator of this.operators) {
      const lexerString = operator.lexerString;
      if (str.startsWith(lexerString, startIndex)) {
        return {
          accepted: true,
          type: 'OPERATOR',
          value: operator.tokenString,
          newIndex: startIndex + lexerString.length,
        };
      }
    }
    return { accepted: false };
  }

  // Recognize parentheses "(" and ")" and return them as BRACKET tokens.
  #readParenthesis(str, startIndex) {
    let value = '';
    if (str[startIndex] === ')') {
      value = ')';
    } else if (str[startIndex] === '(') {
      value = '(';
    } else {
      return { accepted: false };
    }
    return {
      accepted: true,
      type: 'BRACKET',
      value: value,
      newIndex: startIndex + 1,
    };
  }

  // Match registered function names by lexerString and return as FUNCTION token.
  #readFunction(str, startIndex) {
    for (const func of this.functions) {
      const lexerString = func.lexerString;
      if (str.startsWith(lexerString, startIndex)) {
        return {
          accepted: true,
          type: 'FUNCTION',
          value: func.tokenString,
          newIndex: startIndex + lexerString.length,
        };
      }
    }
    return {
      accepted: false,
    };
  }

  // Match registered constants (like π or e) and return as CONSTANT token.
  #readConstant(str, startIndex) {
    for (const constant of this.constants) {
      const lexerString = constant.lexerString;
      if (str.startsWith(lexerString, startIndex)) {
        return {
          type: 'CONSTANT',
          accepted: true,
          value: constant.tokenString,
          newIndex: startIndex + lexerString.length,
        };
      }
    }
    return {
      accepted: false,
    };
  }

  // Return true if char is a decimal digit (0-9).
  #isDigit(char) {
    const charCode = char.charCodeAt(0);
    if (charCode >= 48 && charCode <= 57) {
      return true;
    }
    return false;
  }

  // Determine if a "-" at the current position should be treated as unary negative.
  // It's unary when at start or after another operator/opening bracket; otherwise binary.
  #isNegative(tokens) {
    if (tokens.length === 0) {
      return true;
    } else if (
      tokens[tokens.length - 1].type === 'CONSTANT' ||
      tokens[tokens.length - 1].type === 'NUMBER' ||
      tokens[tokens.length - 1].value === ')'
    ) {
      return false;
    }
    return true;
  }
}

module.exports = Tokenizer;
