'use strict';

const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validateExpression = [
  body('expression')
    .exists({ checkNull: true })
    .withMessage('expression is required')
    .bail()
    .isString()
    .withMessage('expression must be a string')
    .bail()
    .isLength({ max: 500 })
    .withMessage('expression must be at most 500 characters')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('expression must not be empty'),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new AppError('Invalid expression', 400, 'VALIDATION_ERROR'));
    }

    return next();
  },
];

module.exports = validateExpression;
