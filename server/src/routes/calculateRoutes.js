'use strict';

const express = require('express');
const validateExpression = require('../middleware/validateExpression');
const calculateController = require('../controllers/calculateController');

const router = express.Router();

router.post('/api/v1/calculate', validateExpression, calculateController);

module.exports = router;
