import { constants, functions, operators } from "../calculator/operations.js";
import Tokenizer from "../calculator/tokenizer.js";

const tokenizer = new Tokenizer(operators, functions, constants);

console.log(tokenizer.tokenize("5+4+tan5-4-5*8*7/3"));
