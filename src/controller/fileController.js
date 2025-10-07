
const { Model } = require("mongoose");
const mongoose = require("mongoose");
const multer = require("multer");
const { getGFS } = require("../configs/gridfs");

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("file");

const uploadFile = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const gfs = getGFS();
        if (!gfs) return res.status(500).json({ error: "GridFS chưa kết nối" });

        const writeStream = gfs.openUploadStream(req.file.originalname);
        writeStream.end(req.file.buffer);

        writeStream.on("finish", () => {
            res.json({
                message: "File uploaded successfully",
                fileId: writeStream.id,
                fileName: req.file.originalname
            });
        });

        writeStream.on("error", (err) => res.status(500).json({ error: err.message }));
    });
};

const getFileById = async (req, res) => {
    try {
        const gfs = getGFS();
        const fileId = new mongoose.Types.ObjectId(req.params.id);

        const files = await gfs.find({ _id: fileId }).toArray();
        if (!files || files.length === 0)
            return res.status(404).json({ error: "File not found" });

        const file = files[0];
        const downloadStream = gfs.openDownloadStream(file._id);

        const chunks = [];
        downloadStream.on("data", (chunk) => chunks.push(chunk));
        downloadStream.on("error", (err) => res.status(500).json({ error: err.message }));
        downloadStream.on("end", () => {
            const buffer = Buffer.concat(chunks);
            res.set("Content-Type", file.contentType);
            res.set("Content-Disposition", `inline; filename="${file.filename}"`);
            res.send(buffer);
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


module.exports = { uploadFile, getFileById };
