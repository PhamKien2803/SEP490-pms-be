const { HTTP_STATUS } = require('../constants/useConstants');
const Post = require('../models/postModel');
const PostFile = require('../models/postFileModel');
const SchoolYear = require('../models/schoolYearModel');
const Class = require('../models/classModel');

exports.getAllPostFileByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    const schoolYear = await SchoolYear.findOne({
      active: true,
      state: "Đang hoạt động"
    });

    if (!schoolYear) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Không có năm học nào đang hoạt động!",
      });
    }

    const classes = await Class.findOne({
      teachers: teacherId,
      schoolYear: schoolYear._id,
      active: true,
    })

    if (!classes) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Giáo viên chưa được phân lớp học trong năm học này!",
      });
    }

    const posts = await Post.find({
      active: true,
      classId: classes._id,
    });

    if (!posts.length) {
      return res.status(200).json([]);
    }

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

exports.getClassByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    const schoolYear = await SchoolYear.findOne({
      active: true,
      state: "Đang hoạt động"
    });

    if (!schoolYear) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Không có năm học nào đang hoạt động!",
      });
    }

    const classes = await Class.findOne({
      teachers: teacherId,
      schoolYear: schoolYear._id,
      active: true,
    })

    if (!classes) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Giáo viên chưa được phân lớp học trong năm học này!",
      });
    }
    return res.status(200).json({ classes });
  } catch (error) {
    console.error("error getAllPostFileByClass:", error);
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách file của lớp",
      error: error.message,
    });
  }
};