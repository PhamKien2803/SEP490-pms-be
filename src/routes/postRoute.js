const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const Post = require("../models/postModel");
const PostFile = require("../models/postFileModel");
const { deletedSoftGeneric, findAllGeneric, updateGeneric, createGeneric } = require("../controller/useController");
const { getByIdPostController, getPostByClass } = require("../controller/postFileController");
const upload = multer({ dest: "uploads/" });
const { getAllPostFileByTeacher, getClassByTeacher } = require("../controller/postFileController");
const fs = require("fs");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Post)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Post)
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Post)
);

router.get("/list/",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Post)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdPostController
);

router.get("/getPostByClass/:id",
    verifyToken,
    authorizeAction("view"),
    getPostByClass
);


router.post("/:postId/upload", upload.array("files", 10), async (req, res) => {
    try {
        const { postId } = req.params;

        const uploadedFiles = [];

        for (const file of req.files) {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "activity_class",
                resource_type: "auto",
            });

            fs.unlinkSync(file.path);

            const fileType = result.resource_type === "video" ? "video" : "image";

            const newFile = await PostFile.create({
                postId,
                fileUrl: result.secure_url,
                fileType,
                fileSize: file.size,
                cloudinaryPublicId: result.public_id,
                createdBy: "system",
            });

            uploadedFiles.push(newFile);
        }

        res.status(201).json({
            message: "Upload thành công!",
            data: uploadedFiles,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post("/:id/delete", async (req, res) => {
    try {
        const { id } = req.params;

        const file = await PostFile.findById(id);
        if (!file) {
            return res.status(404).json({ message: "Không tìm thấy file!" });
        }

        if (file.cloudinaryPublicId) {
            await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
                resource_type: file.fileType === "video" ? "video" : "image",
            });
        }

        file.active = false;
        await file.save();

        res.status(200).json({ message: "Đã xóa file thành công!", data: file });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/getPostFileByTeacher/:id",
    verifyToken,
    authorizeAction("view"),
    getAllPostFileByTeacher
);

router.get("/getClassByTeacher/:id",
    verifyToken,
    authorizeAction("view"),
    getClassByTeacher
);

module.exports = router;
