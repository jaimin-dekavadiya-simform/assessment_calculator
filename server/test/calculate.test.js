'use strict';

const request = require('supertest');
const app = require('../src/app');
const errorHandler = require('../src/middleware/errorHandler');

const successCases = [
  {
    name: 'respects arithmetic precedence (2 + 3 * 4)',
    expression: '2 + 3 * 4',
    expected: 14,
  },
  {
    name: 'treats exponentiation as right-associative (2 ^ 3 ^ 2)',
    expression: '2 ^ 3 ^ 2',
    expected: 512,
  },
  {
    name: 'evaluates nested parentheses',
    expression: '(1 + 2) * (3 + 4) / (5 - 6/3)',
    expected: 7,
  },
  {
    name: 'evaluates trig, log, ln, sqrt, power and factorial',
    expression: 'sin(π/2) + cos(π) + log(100) + ln(e^2) + √(16) + 2^3 + 5!',
    expected: 136,
  },
  {
    name: 'supports π and e constants',
    expression: 'π + e',
    expected: Math.PI + Math.E,
  },
  {
    name: 'binds unary minus looser than power (-3^2)',
    expression: '-3^2',
    expected: -9,
  },
  {
    name: 'honours parenthesized unary minus ((-3)^2)',
    expression: '(-3)^2',
    expected: 9,
  },
  {
    name: 'ignores whitespace and newlines',
    expression: '\n\t 2 + \n 3 \n * 4 \n',
    expected: 14,
  },
  {
    name: 'suppresses floating-point noise (0.1 + 0.2)',
    expression: '0.1 + 0.2',
    expected: 0.3,
  },
  {
    name: 'echoes the trimmed expression',
    expression: '   2 + 3   ',
    expected: 5,
  },
  {
    name: 'ignores unknown body fields',
    expression: '2 + 3',
    expected: 5,
    extra: { ignored: true },
  },
];

const validationErrorCases = [
  { name: 'missing expression', payload: {} },
  { name: 'blank expression', payload: { expression: '' } },
  { name: 'whitespace-only expression', payload: { expression: '   ' } },
  { name: 'non-string expression', payload: { expression: 42 } },
  { name: 'expression over 500 characters', payload: { expression: '1'.repeat(501) } },
];

const invalidExpressionCases = [
  { name: 'unknown token', expression: '2 @ 3' },
  { name: 'unbalanced parentheses', expression: '(1 + 2' },
  { name: 'malformed number', expression: '1.2.3' },
  { name: 'implicit multiplication', expression: '2(3+4)' },
];

const mathErrorCases = [
  { name: 'division by zero', expression: '10 / 0' },
  { name: 'modulo by zero', expression: '10 % 0' },
  { name: 'square root of a negative number', expression: '√(-1)' },
  { name: 'log of zero', expression: 'log(0)' },
  { name: 'ln of a negative number', expression: 'ln(-1)' },
  { name: 'tan at a vertical asymptote', expression: 'tan(π/2)' },
  { name: 'factorial of a negative number', expression: '(-1)!' },
  { name: 'factorial of a non-integer', expression: '(1.5)!' },
  { name: 'non-finite result', expression: '(-1)^0.5' },
];

describe('POST /api/v1/calculate — success corpus', () => {
  it.each(successCases)('$name', async ({ expression, expected, extra }) => {
    const payload = { expression, ...(extra || {}) };

    const response = await request(app).post('/api/v1/calculate').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.expression).toBe(expression.trim());
    expect(response.body.result).toBeCloseTo(expected, 12);

    if (Number.isInteger(expected)) {
      expect(Number.isInteger(response.body.result)).toBe(true);
    }
  });
});

describe('POST /api/v1/calculate — validation errors', () => {
  it.each(validationErrorCases)(
    'rejects $name with VALIDATION_ERROR',
    async ({ payload }) => {
      const response = await request(app).post('/api/v1/calculate').send(payload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid expression' },
      });
    },
  );

  it('rejects malformed JSON with VALIDATION_ERROR', async () => {
    const response = await request(app)
      .post('/api/v1/calculate')
      .set('Content-Type', 'application/json')
      .send('{"expression": "2 + 3"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON' },
    });
  });
});

describe('POST /api/v1/calculate — invalid expression errors', () => {
  it.each(invalidExpressionCases)(
    'rejects $name with INVALID_EXPRESSION',
    async ({ expression }) => {
      const response = await request(app)
        .post('/api/v1/calculate')
        .send({ expression });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_EXPRESSION');
      expect(typeof response.body.error.message).toBe('string');
    },
  );
});

describe('POST /api/v1/calculate — math errors', () => {
  it.each(mathErrorCases)('rejects $name with MATH_ERROR', async ({ expression }) => {
    const response = await request(app)
      .post('/api/v1/calculate')
      .send({ expression });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('MATH_ERROR');
    expect(typeof response.body.error.message).toBe('string');
  });
});

describe('errorHandler fallback', () => {
  it('returns 500 INTERNAL_ERROR for an unexpected error', () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    };

    errorHandler(new Error('boom'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
