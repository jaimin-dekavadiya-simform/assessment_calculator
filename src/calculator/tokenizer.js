export default class Tokenizer {
  constructor(operators, functions, constants) {
    this.operators = [...operators.values()];
    this.functions = [...functions.values()];
    this.constants = [...constants.values()];
  }

  tokenize(str) {
    if (str.length === 0) {
      throw new Error("Lexer : can not tokenize empty string");
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
      if (str[index] === " " || str[index] == "\n" || str[index] == "\t") {
        index++;
        continue;
      }
      for (const matcher of matchers) {
        const res = matcher.call(this, str, index, tokens);
        if (res.accepted) {
          this.#implicitBefore(res, tokens);

          tokens.push({ type: res.type, value: res.value });
          index = res.newIndex;
          accepted = true;
          this.#implicitAfter(res, tokens, functionCounter);

          break;
        }
      }

      if (!accepted) {
        throw new Error("Lexer : Invalid Input");
      }
    }

    return tokens;
  }
  #implicitBefore(res, tokens) {
    if (
      res.type === "CONSTANT" ||
      res.type === "NUMBER" ||
      (res.type === "BRACKET" && res.value === "(")
    ) {
      let lastToken = tokens[tokens.length - 1];

      if (
        lastToken?.type === "NUMBER" ||
        lastToken?.type === "CONSTANT" ||
        (lastToken?.type === "BRACKET" && lastToken?.value === ")")
      ) {
        tokens.push({ type: "OPERATOR", value: "*" });
      }
    }
  }
  #implicitAfter(res, tokens, functionCounter) {
    if (res.type === "FUNCTION") {
      tokens.push({ type: "BRACKET", value: "(" });
      functionCounter.value++;
    } else if (res.type === "NUMBER" || res.type === "CONSTANT") {
      while (functionCounter.value !== 0) {
        functionCounter.value--;
        tokens.push({ type: "BRACKET", value: ")" });
      }
    }
  }
  #readNumber(str, startIndex) {
    let i = startIndex;
    let decimalFlag = false;
    while (i < str.length && (this.#isDigit(str[i]) || str[i] === ".")) {
      if (str[i] === ".") {
        if (decimalFlag) {
          throw new Error("Lexer : Number Format not allowed");
        }
        decimalFlag = true;
        i++;
      } else {
        i++;
      }
    }
    if (i == startIndex) {
      return { accepted: false };
    }
    return {
      accepted: true,
      type: "NUMBER",
      newIndex: i,
      value: Number(str.slice(startIndex, i)),
    };
  }
  #readOperator(str, startIndex, tokens) {
    if (str[startIndex] === "-") {
      if (this.#isNegative(tokens)) {
        return {
          accepted: true,
          type: "OPERATOR",
          value: "NEG",
          newIndex: startIndex + 1,
        };
      }
      return {
        accepted: true,
        type: "OPERATOR",
        value: "-",
        newIndex: startIndex + 1,
      };
    }

    for (const operator of this.operators) {
      let lexerString = operator.lexerString;
      if (str.startsWith(lexerString, startIndex)) {
        return {
          accepted: true,
          type: "OPERATOR",
          value: operator.tokenString,
          newIndex: startIndex + lexerString.length,
        };
      }
    }
    return { accepted: false };
  }
  #readParenthesis(str, startIndex) {
    let value = "";
    if (str[startIndex] === ")") {
      value = ")";
    } else if (str[startIndex] === "(") {
      value = "(";
    } else {
      return { accepted: false };
    }
    return {
      accepted: true,
      type: "BRACKET",
      value: value,
      newIndex: startIndex + 1,
    };
  }
  #readFunction(str, startIndex) {
    for (const func of this.functions) {
      let lexerString = func.lexerString;
      if (str.startsWith(lexerString, startIndex)) {
        return {
          accepted: true,
          type: "FUNCTION",
          value: func.tokenString,
          newIndex: startIndex + lexerString.length,
        };
      }
    }
    return {
      accepted: false,
    };
  }
  #readConstant(str, startIndex) {
    for (const constant of this.constants) {
      let lexerString = constant.lexerString;
      if (str.startsWith(lexerString, startIndex)) {
        return {
          type: "CONSTANT",
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
  #isDigit(char) {
    const charCode = char.charCodeAt(0);
    if (charCode >= 48 && charCode <= 57) {
      return true;
    }
    return false;
  }
  #isNegative(tokens) {
    if (tokens.length === 0) {
      return true;
    } else if (
      tokens[tokens.length - 1].type === "CONSTANT" ||
      tokens[tokens.length - 1].type === "NUMBER" ||
      tokens[tokens.length - 1].value === ")"
    ) {
      return false;
    }
    return true;
  }
}
