'use strict';

const calculatorService = require('../services/calculatorService');

function toResponseResult(result) {
  return Number.isInteger(result) ? Math.trunc(result) : result;
}

function calculateController(req, res, next) {
  try {
    const expression = req.body.expression.trim();
    const result = calculatorService.calculate(expression);

    return res.status(200).json({
      expression,
      result: toResponseResult(result),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = calculateController;
