const dotenv = require("dotenv");
dotenv.config();
const Queue = require('bull');

const emailQueue = new Queue('emailQueue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD
  }
});

module.exports = { emailQueue };
