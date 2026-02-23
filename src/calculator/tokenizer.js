import { isDigit,isNegative } from "../utils/tokenizerUtils.js";
export default class Tokenizer {
  constructor(operators, functions, constants) {
    this.operators = [...operators.values()];
    this.functions = [...functions.values()];
    this.constants = [...constants.values()];
  }

  tokenize(str) {
    if(str.length === 0){
        throw new Error("Lexer : can not tokenize empty string")
    }
    const tokens = [];
    const matchers = [
      this.#readNumber,
      this.#readOperator,
      this.#readParenthesis,
      this.#readFunction,
      this.#readConstant,
    ];
    let index = 0;
    while (index < str.length) {
      let accepted = false;
      if(str[index] === " "){
        index++
        continue;
      }
      for (const matcher of matchers) {
        const res = matcher.call(this, str, index, tokens);
        if (res.accepted) {
          tokens.push({ type: res.type, value: res.value });
          index = res.newIndex;
          accepted = true;
          break;
        }
      }

      if (!accepted) {
        throw new Error("Lexer : Invalid Input");
      }
    }
    return tokens;
  }
  #readNumber(str, startIndex) {
    let i = startIndex;
    let decimalFlag = false;
    while (i < str.length && (isDigit(str[i]) || str[i] === ".")) {
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
      if (isNegative(tokens)) {
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
}
