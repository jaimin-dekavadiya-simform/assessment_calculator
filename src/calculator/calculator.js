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
    try {
      const inFixExpression = tokenizer.tokenize(str);
      const postFixExpression = parser.parse(inFixExpression);
      const answer = evaluator.evaluate(postFixExpression);
      return answer;
    } catch (e) {
      throw new Error("Error " + e.message);
    }
  }
}
