const serverless = require('serverless-http');
const app = require('../../backend/src/index');

module.exports.handler = serverless(app);
