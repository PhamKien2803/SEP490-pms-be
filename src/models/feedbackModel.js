const mongoose = require('mongoose');

const EatingSchema = new mongoose.Schema({
  breakfast: {
    type: String,
    enum: ['hết', 'gần hết', 'một nửa', 'ít', 'không ăn', ''],
    default: ''
  },
  lunch: {
    type: String,
    enum: ['hết', 'gần hết', 'một nửa', 'ít', 'không ăn', ''],
    default: ''
  },
  snack: {
    type: String,
    enum: ['hết', 'gần hết', 'một nửa', 'ít', 'không ăn', ''],
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const SleepingSchema = new mongoose.Schema({
  duration: {
    type: String,
    default: ''
  },
  quality: {
    type: String,
    enum: ['ngủ sâu', 'tốt', 'nhẹ', 'không yên', 'khó ngủ', ''],
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const HygieneSchema = new mongoose.Schema({
  toilet: {
    type: String,
    enum: ['tự lập', 'nhắc nhở', 'cần giúp', 'bị sự cố', ''],
    default: ''
  },
  handwash: {
    type: String,
    enum: ['tốt', 'nhắc nhở', 'cần giúp', ''],
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const LearningSchema = new mongoose.Schema({
  focus: {
    type: String,
    enum: ['xuất sắc', 'tốt', 'trung bình', 'cần cố gắng', ''],
    default: ''
  },
  participation: {
    type: String,
    enum: ['tích cực', 'tốt', 'rụt rè', 'miễn cưỡng', ''],
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const SocialSchema = new mongoose.Schema({
  friendInteraction: {
    type: String,
    enum: ['xuất sắc', 'tốt', 'trung bình', 'xung đột', 'rụt rè', ''],
    default: ''
  },
  emotionalState: {
    type: String,
    enum: ['ổn định', 'thay đổi thất thường', 'lo lắng', 'buồn', 'vui vẻ', ''],
    default: ''
  },
  behavior: {
    type: String,
    enum: ['xuất sắc', 'tốt', 'trung bình', 'khó bảo', ''],
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const HealthSchema = new mongoose.Schema({
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const FeedbackSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },

  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },

  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    index: true
  },

  // Ngày feedback
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  eating: {
    type: EatingSchema,
    default: () => ({})
  },
  sleeping: {
    type: SleepingSchema,
    default: () => ({})
  },
  hygiene: {
    type: HygieneSchema,
    default: () => ({})
  },
  learning: {
    type: LearningSchema,
    default: () => ({})
  },
  social: {
    type: SocialSchema,
    default: () => ({})
  },
  health: {
    type: HealthSchema,
    default: () => ({})
  },

  dailyHighlight: {
    type: String,
    default: ''
  },
  teacherNote: {
    type: String,
    default: ''
  },
  reminders: [{
    type: String
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

FeedbackSchema.index({ studentId: 1, date: -1 });
FeedbackSchema.index({ teacherId: 1, date: -1 });
FeedbackSchema.index({ classId: 1, date: -1 });

const Feedback = mongoose.model('Feedback', FeedbackSchema);

module.exports = Feedback;
