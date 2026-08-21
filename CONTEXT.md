# Scientific Calculator

A modular, extensible in-browser scientific calculator that evaluates arithmetic and scientific expressions. This context defines the shared language of the calculator's expression-processing domain.

## Language

**Expression**:
The mathematical text a user submits — numbers, operators, functions, constants, and brackets — that the calculator evaluates to a single numeric result.
_Avoid_: input string, formula

**Token**:
A single classified unit produced from an expression: a number, operator, function, constant, or bracket.
_Avoid_: symbol, lexeme

**Tokenizer**:
The processing stage that converts an expression into an ordered sequence of tokens.
_Avoid_: lexer, scanner

**Parser**:
The processing stage that converts a token sequence into RPN, validating structure and precedence.
_Avoid_: syntax analyzer

**RPN**:
Reverse Polish Notation — the token order in which every operator or function follows its operands; the form the evaluator consumes.
_Avoid_: postfix notation

**Evaluator**:
The processing stage that computes the numeric result from RPN using a stack.
_Avoid_: interpreter, engine

**Registry**:
The central catalogue that defines the available operators, functions, and constants and their behaviour.
_Avoid_: lookup table

**History entry**:
A persisted record of one successfully evaluated expression together with its numeric result.
_Avoid_: record, log entry

**Precision**:
The number of decimal places to which numeric results are rounded.
_Avoid_: accuracy
