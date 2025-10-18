const { emailQueue } = require('../configs/queue');
const SMTP = require("../helpers/stmpHelper");
const { SMTP_CONFIG } = require("../constants/mailConstants");

emailQueue.process(async job => {
  const { to, cc, subject, html, attachments } = job.data;
  console.log(`Đang gửi email tới ${to} và CC ${cc}`);

  const mail = new SMTP(SMTP_CONFIG);

  return new Promise((resolve, reject) => {
    mail.send(to, cc || '', subject, html, attachments, (err, info) => {
      if (err) {
        console.error('Gửi email lỗi:', err);
        return reject(err);
      }
      console.log('Email đã gửi tới:', to);
      resolve(info);
    });
  });
});
