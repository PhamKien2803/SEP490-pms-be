const { HTTP_STATUS } = require('../constants/useConstants');
const Post = require('../models/postModel');
const PostFile = require('../models/postFileModel');

exports.getAllPostFileByClass = async (req, res) => {
  try {
    const classId = req.params.id

    const post = await Post.findOne({
      active: true,
      classId: classId,
    });

    if (!post) {
      return res.status(200).json([]);
    }

    const postFile = await PostFile.find({
      active: true,
      postId: post.id
    })
      .populate({
        path: "postId",
        select: "classId teacherId title content createdBy",
        populate: [
          { path: "classId", select: "classCode className teachers age room" },
          { path: "teacherId", select: "staffCode fullName email" }
        ]
      });

    if (!postFile) {
      return res.status(200).json([]);
    }

    return res.status(HTTP_STATUS.OK).json({
      postFile
    });

  } catch (error) {
    console.error("error getAllPostFileByClass:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
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