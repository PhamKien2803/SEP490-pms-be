const { HTTP_STATUS } = require('../constants/useConstants');
const Post = require('../models/postModel');
const PostFile = require('../models/postFileModel');

exports.getAllPostFileByClass = async (req, res) => {
  try {
    const classId = req.params.id;

    // 🔹 Lấy tất cả bài post của lớp
    const posts = await Post.find({
      active: true,
      classId: classId,
    });

    if (!posts.length) {
      return res.status(200).json([]);
    }

    // 🔹 Lấy tất cả file thuộc các bài post này
    const postIds = posts.map((p) => p._id);

    const postFiles = await PostFile.find({
      active: true,
      postId: { $in: postIds },
    })
      .populate({
        path: "postId",
        select: "classId teacherId title content createdBy",
        populate: [
          { path: "classId", select: "classCode className teachers age room" },
          { path: "teacherId", select: "staffCode fullName email" },
        ],
      })
      .lean();

    // 🔹 Nhóm dữ liệu theo từng bài post
    const grouped = Object.values(
      postFiles.reduce((acc, file) => {
        const post = file.postId;
        const postId = post._id.toString();

        if (!acc[postId]) {
          acc[postId] = {
            postId: postId,
            title: post.title,
            content: post.content,
            createdBy: post.createdBy,
            teacher: post.teacherId,
            class: post.classId,
            files: [],
          };
        }

        acc[postId].files.push({
          _id: file._id,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          fileSize: file.fileSize,
          cloudinaryPublicId: file.cloudinaryPublicId,
          createdAt: file.createdAt,
        });

        return acc;
      }, {})
    );

    return res.status(200).json({
      count: grouped.length,
      posts: grouped,
    });
  } catch (error) {
    console.error("error getAllPostFileByClass:", error);
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách file của lớp",
      error: error.message,
    });
  }
};

exports.getByIdPostController = async (req, res) => {
  try {

    const data = await Post.findById(req.params.id)
      .populate({
        path: "classId",
        select: "classCode className age",
      })
      .populate({
        path: "teacherId",
        select: "staffCode fullName email",
      })
      .lean();

    if (!data) {
      return res.status(200).json([]);
    }

    const result = {
      ...data,
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error("error getByIdController:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy thông tin Album",
      error: error.message,
    });
  }
};

exports.getPostByClass = async (req, res) => {
  try {

    const data = await Post.find({
      active: true,
      classId: req.params.id,
    })
      .populate({
        path: "classId",
        select: "classCode className age",
      })
      .populate({
        path: "teacherId",
        select: "staffCode fullName email",
      })
      .lean();

    if (!data) {
      return res.status(200).json([]);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("error getByIdController:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy thông tin Album",
      error: error.message,
    });
  }
};