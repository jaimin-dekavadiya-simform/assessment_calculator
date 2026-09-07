'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');

const router = express.Router();

const openapiPath = path.join(__dirname, '..', '..', 'openapi.yaml');
const openapiDocument = yaml.load(fs.readFileSync(openapiPath, 'utf8'));

router.get('/openapi.yaml', (req, res) => {
  const rawYaml = fs.readFileSync(openapiPath, 'utf8');
  return res.type('application/yaml').send(rawYaml);
});

const swaggerUiHandler = swaggerUi.setup(openapiDocument);

router.get('/docs', swaggerUiHandler);
router.use('/docs', swaggerUi.serve, swaggerUiHandler);

module.exports = router;
