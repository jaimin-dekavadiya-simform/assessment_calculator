'use strict';

const AppError = require('../src/utils/AppError');
const {
  add,
  subtract,
  multiply,
  divide,
  modulo,
  power,
  sqrt,
  factorial,
  calculate,
} = require('../src/services/calculatorService');

function expectCalculate(expression, expected) {
  expect(calculate(expression)).toBeCloseTo(expected, 12);
}

function expectAppError(fn, code) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error('Expected an AppError to be thrown');
}

describe('calculatorService primitives', () => {
  test('add', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('subtract', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  test('multiply', () => {
    expect(multiply(5, 3)).toBe(15);
  });

  test('divide', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('modulo', () => {
    expect(modulo(10, 3)).toBe(1);
  });

  test('power', () => {
    expect(power(2, 3)).toBe(8);
  });

  test('sqrt', () => {
    expect(sqrt(25)).toBe(5);
  });

  test('factorial', () => {
    expect(factorial(5)).toBe(120);
    expect(factorial(1)).toBe(1);
    expect(factorial(0)).toBe(1);
  });

  test('divide rejects a zero divisor', () => {
    expectAppError(() => divide(10, 0), 'MATH_ERROR');
  });

  test('modulo rejects a zero divisor', () => {
    expectAppError(() => modulo(10, 0), 'MATH_ERROR');
  });

  test('sqrt rejects negative input', () => {
    expectAppError(() => sqrt(-4), 'MATH_ERROR');
  });

  test('factorial rejects negative input', () => {
    expectAppError(() => factorial(-1), 'MATH_ERROR');
  });

  test('factorial rejects non-integer input', () => {
    expectAppError(() => factorial(2.5), 'MATH_ERROR');
  });
});

describe('calculatorService.calculate — basic arithmetic and precedence', () => {
  test('3 + 4', () => {
    expectCalculate('3 + 4', 7);
  });

  test('3 + 4 * 2', () => {
    expectCalculate('3 + 4 * 2', 11);
  });

  test('(3 + 4) * 2', () => {
    expectCalculate('(3 + 4) * 2', 14);
  });

  test('3 + 4 * 2 / (1 - 5)', () => {
    expectCalculate('3 + 4 * 2 / (1 - 5)', 1);
  });

  test('(1 + 2) * (3 + 4) / (5 - 6/3)', () => {
    expectCalculate('(1 + 2) * (3 + 4) / (5 - 6/3)', 7);
  });
});

describe('calculatorService.calculate — exponentiation and associativity', () => {
  test('2 ^ 3 ^ 2 is right-associative', () => {
    expectCalculate('2 ^ 3 ^ 2', 512);
  });

  test('(2 ^ 3) ^ 2', () => {
    expectCalculate('(2 ^ 3) ^ 2', 64);
  });

  test('2 ^ 3 * 4', () => {
    expectCalculate('2 ^ 3 * 4', 32);
  });

  test('2 * 3 ^ 4', () => {
    expectCalculate('2 * 3 ^ 4', 162);
  });

  test('3 - 2 - 1 is left-associative', () => {
    expectCalculate('3 - 2 - 1', 0);
  });
});

describe('calculatorService.calculate — constants', () => {
  test('e ^ π', () => {
    expectCalculate('e ^ π', Math.E ** Math.PI);
  });

  test('π ^ 2 + e', () => {
    expectCalculate('π ^ 2 + e', Math.PI ** 2 + Math.E);
  });

  test('2 * π', () => {
    expectCalculate('2 * π', 2 * Math.PI);
  });

  test('3 * e ^ 2', () => {
    expectCalculate('3 * e ^ 2', 3 * Math.E ** 2);
  });
});

describe('calculatorService.calculate — functions', () => {
  test('sin(π/6)', () => {
    expectCalculate('sin(π/6)', 0.5);
  });

  test('cos(π)', () => {
    expectCalculate('cos(π)', -1);
  });

  test('tan(π/4)', () => {
    expectCalculate('tan(π/4)', 1);
  });

  test('ln(e^2)', () => {
    expectCalculate('ln(e^2)', 2);
  });

  test('log is base-10', () => {
    expectCalculate('log(1000)', 3);
  });

  test('√(2 + 3)', () => {
    expectCalculate('√(2 + 3)', Math.sqrt(5));
  });

  test('sin π uses implicit function-call parentheses', () => {
    expectCalculate('sin π', 0);
  });

  test('ln e', () => {
    expectCalculate('ln e', 1);
  });

  test('√ 9', () => {
    expectCalculate('√ 9', 3);
  });

  test('cos 0', () => {
    expectCalculate('cos 0', 1);
  });

  test('sin cos π', () => {
    expectCalculate('sin cos π', Math.sin(Math.cos(Math.PI)));
  });

  test('ln √ 16', () => {
    expectCalculate('ln √ 16', Math.log(Math.sqrt(16)));
  });

  test('√ ln e', () => {
    expectCalculate('√ ln e', Math.sqrt(Math.log(Math.E)));
  });

  test('sin(cos(π/3))', () => {
    expectCalculate('sin(cos(π/3))', Math.sin(Math.cos(Math.PI / 3)));
  });

  test('sin(π/3) * ln(e^5)', () => {
    expectCalculate('sin(π/3) * ln(e^5)', Math.sin(Math.PI / 3) * Math.log(Math.E ** 5));
  });

  test('(3 * π + e^2) / 5', () => {
    expectCalculate('(3 * π + e^2) / 5', (3 * Math.PI + Math.E ** 2) / 5);
  });

  test('(2 * e^(π/2)) / √(π)', () => {
    expectCalculate('(2 * e^(π/2)) / √(π)', (2 * Math.E ** (Math.PI / 2)) / Math.sqrt(Math.PI));
  });

  test('tan(π/8) + cos(π/5)', () => {
    expectCalculate('tan(π/8) + cos(π/5)', Math.tan(Math.PI / 8) + Math.cos(Math.PI / 5));
  });

  test('(π^3 - 10)^(1/3)', () => {
    expectCalculate('(π^3 - 10)^(1/3)', (Math.PI ** 3 - 10) ** (1 / 3));
  });

  test('sin ln e', () => {
    expectCalculate('sin ln e', Math.sin(Math.log(Math.E)));
  });

  test('ln(1)', () => {
    expectCalculate('ln(1)', 0);
  });

  test('log(1)', () => {
    expectCalculate('log(1)', 0);
  });

  test('√(0)', () => {
    expectCalculate('√(0)', 0);
  });

  test('sin(0)', () => {
    expectCalculate('sin(0)', 0);
  });

  test('cos(0)', () => {
    expectCalculate('cos(0)', 1);
  });

  test('ln(e^0)', () => {
    expectCalculate('ln(e^0)', 0);
  });
});

describe('calculatorService.calculate — whitespace and mixed expressions', () => {
  test('extra spaces', () => {
    expectCalculate('   sin(  π  /  6   )  ', 0.5);
  });

  test('tabs and newlines', () => {
    expectCalculate('\n\tcos(\nπ\t)\n', -1);
  });

  test('√  (  2  ) + sin π', () => {
    expectCalculate('√  (  2  ) + sin π', Math.sqrt(2));
  });

  test('ln e + cos π', () => {
    expectCalculate('ln e + cos π', 0);
  });

  test('sin cos ln e', () => {
    expectCalculate('sin cos ln e', Math.sin(Math.cos(Math.log(Math.E))));
  });

  test('2 * π (explicit)', () => {
    expectCalculate('2 * π', 2 * Math.PI);
  });

  test('3 * (π) (explicit)', () => {
    expectCalculate('3 * (π)', 3 * Math.PI);
  });

  test('(1+2) * (3+4) (explicit)', () => {
    expectCalculate('(1+2) * (3+4)', 21);
  });
});

describe('calculatorService.calculate — unary operators', () => {
  test('-3', () => {
    expectCalculate('-3', -3);
  });

  test('-(3)', () => {
    expectCalculate('-(3)', -3);
  });

  test('-3^2 binds unary minus looser than power', () => {
    expectCalculate('-3^2', -9);
  });

  test('(-3)^2', () => {
    expectCalculate('(-3)^2', 9);
  });

  test('sin(-π/6)', () => {
    expectCalculate('sin(-π/6)', -0.5);
  });

  test('-sin(π/6)', () => {
    expectCalculate('-sin(π/6)', -0.5);
  });
});

describe('calculatorService.calculate — floating point robustness', () => {
  test('0.1 + 0.2 is close to 0.3', () => {
    expectCalculate('0.1 + 0.2', 0.3);
  });

  test('complex mix', () => {
    expectCalculate(
      ' ( 2 * e^(π/2) ) / √(π) + sin(π/3) * ln(e^5) - cos(2*π) ',
      (2 * Math.E ** (Math.PI / 2)) / Math.sqrt(Math.PI) +
        Math.sin(Math.PI / 3) * Math.log(Math.E ** 5) -
        Math.cos(2 * Math.PI),
    );
  });
});

describe('calculatorService.calculate — invalid expressions', () => {
  test('rejects implicit multiplication NUMBER followed by (', () => {
    expectAppError(() => calculate('2(3+4)'), 'INVALID_EXPRESSION');
  });

  test('rejects implicit multiplication NUMBER followed by CONSTANT', () => {
    expectAppError(() => calculate('2π'), 'INVALID_EXPRESSION');
  });

  test('rejects adjacent numbers', () => {
    expectAppError(() => calculate('2 3'), 'INVALID_EXPRESSION');
  });

  test('rejects implicit multiplication ) followed by (', () => {
    expectAppError(() => calculate('(1+2)(3+4)'), 'INVALID_EXPRESSION');
  });

  test('rejects mismatched bracket (missing closing)', () => {
    expectAppError(() => calculate('(3 + 4'), 'INVALID_EXPRESSION');
  });

  test('rejects extra closing bracket', () => {
    expectAppError(() => calculate('3 + 4)'), 'INVALID_EXPRESSION');
  });

  test('rejects incomplete expression', () => {
    expectAppError(() => calculate('3 +'), 'INVALID_EXPRESSION');
  });

  test('rejects two binary operators in a row', () => {
    expectAppError(() => calculate('3 * * 4'), 'INVALID_EXPRESSION');
  });

  test('rejects empty function arguments', () => {
    expectAppError(() => calculate('sin()'), 'MATH_ERROR');
  });

  test('rejects a bare function name', () => {
    expectAppError(() => calculate('sin'), 'INVALID_EXPRESSION');
  });

  test('rejects empty parentheses', () => {
    expectAppError(() => calculate('()'), 'INVALID_EXPRESSION');
  });

  test('rejects an expression starting with a binary operator', () => {
    expectAppError(() => calculate('+ 3 4'), 'INVALID_EXPRESSION');
  });

  test('rejects empty input', () => {
    expectAppError(() => calculate(''), 'INVALID_EXPRESSION');
  });
});

describe('calculatorService.calculate — math errors', () => {
  test('division by zero', () => {
    expectAppError(() => calculate('10 / 0'), 'MATH_ERROR');
  });

  test('modulo by zero', () => {
    expectAppError(() => calculate('10 % 0'), 'MATH_ERROR');
  });

  test('square root of a negative number', () => {
    expectAppError(() => calculate('√(-4)'), 'MATH_ERROR');
  });

  test('factorial of a negative number', () => {
    expectAppError(() => calculate('(-1)!'), 'MATH_ERROR');
  });

  test('factorial of a non-integer', () => {
    expectAppError(() => calculate('2.5!'), 'MATH_ERROR');
  });

  test('non-finite result maps to MATH_ERROR', () => {
    expectAppError(() => calculate('(-1)^0.5'), 'MATH_ERROR');
  });

  test('tan rejects values where cos(x) is within 1e-12 of zero', () => {
    expectAppError(() => calculate('tan(π/2)'), 'MATH_ERROR');
  });
});
