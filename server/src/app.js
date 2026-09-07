const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const calculateRoutes = require('./routes/calculateRoutes');
const docsRoutes = require('./routes/docsRoutes');

const app = express();

const corsOrigin =
  config.corsOrigin.length === 1 && config.corsOrigin[0] === '*'
    ? '*'
    : config.corsOrigin;

app.use(express.json());
app.use(cors({ origin: corsOrigin }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(docsRoutes);
app.use(calculateRoutes);

app.use(errorHandler);

module.exports = app;
