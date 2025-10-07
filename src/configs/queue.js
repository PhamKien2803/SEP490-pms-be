const { Worker } = require('bullmq');
const { createClient } = require('redis');
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');

const connection = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
});

connection.on('error', err => console.log('Redis Client Error', err));

await connection.connect();
const mail = new SMTP(SMTP_CONFIG);

const worker = new Worker('emailQueue', async job => {
    const { to, cc, subject, html, attachments } = job.data;

    return new Promise((resolve, reject) => {
        mail.send(to, cc || '', subject, html, attachments, (err, info) => {
            if (err) {
                console.error('Email failed:', to, err);
                reject(err);
            } else {
                console.log('Email sent to:', to);
                resolve(info);
            }
        });
    });
}, { connection, concurrency: 5 });

worker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed`, err);
});
