const dotenv = require('dotenv');

dotenv.config();

const port = Number.parseInt(process.env.PORT, 10) || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';
const corsOrigin = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  port,
  nodeEnv,
  corsOrigin,
};
