const mongoose = require("mongoose");
require("dotenv").config();

let gfs;
let conn;

const connectGridFS = async () => {
    const uri = process.env.MONGO_DB;

    try {
        conn = mongoose.createConnection(uri);

        conn.once("open", () => {
            gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: "pdfs" });
            console.log("✅ GridFS connected successfully");
        });

        return { conn, gfs };
    } catch (err) {
        console.error("❌ GridFS connection error:", err.message);
        process.exit(1);
    }
};

const getGFS = () => gfs;
const getConn = () => conn;

module.exports = { connectGridFS, getGFS, getConn };
