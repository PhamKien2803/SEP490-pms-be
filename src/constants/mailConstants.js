const SMTP_CONFIG = {
    "user": process.env.EMAIL_USER,
    "password": process.env.EMAIL_PASS,
    "host": process.env.HOST_SMTP,
    "port": process.env.PORT_SMTP,
    "tls": process.env.TLS_SMTP,
    "maxConnections": process.env.MAXCONNECTIONS,
    "pool": process.env.POOL,
    "from": process.env.FROM_STMP
}

const IMAP_CONFIG = {
    "user": process.env.EMAIL_USER,
    "password": process.env.EMAIL_PASS,
    "host": process.env.HOST_IMAP,
    "port": process.env.PORT_IMAP,
    "tls": process.env.TLS,
    tlsOptions: { rejectUnauthorized: false }
}

module.exports = {
    SMTP_CONFIG,
    IMAP_CONFIG
};