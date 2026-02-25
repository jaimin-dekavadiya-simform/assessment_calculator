// This class is responsible for calculating the answer from the input string.
// It uses the Evaluator, Parser and Tokenizer classes to perform the calculation.
export default class Calculator {
  constructor(
    Evaluator,
    Parser,
    Tokenizer,
    Stack,
    operators,
    functions,
    constants,
    precision,
  ) {
    this.Evaluator = Evaluator;
    this.Parser = Parser;
    this.Tokenizer = Tokenizer;
    this.operators = operators;
    this.functions = functions;
    this.constants = constants;
    this.precision = precision;
    this.Stack = Stack;
  }
  // This method takes the input string and returns the evaluated answer.
  calculate(str) {
    let evaluator, parser, tokenizer;
    try {
      evaluator = new this.Evaluator(
        this.operators,
        this.functions,
        this.constants,
        this.Stack,
        this.precision,
      );
      parser = new this.Parser(
        this.operators,
        this.functions,
        this.constants,
        this.Stack,
      );
      tokenizer = new this.Tokenizer(
        this.operators,
        this.functions,
        this.constants,
      );
    } catch (e) {
      throw new Error("Calc : Error loading the calculator " + e.message);
    }
    // String to Infix
    const inFixExpression = tokenizer.tokenize(str);
    // Infix to Postfix
    const postFixExpression = parser.parse(inFixExpression);
    // Postfix to Answer
    const answer = evaluator.evaluate(postFixExpression);
    return answer;
  }
}
