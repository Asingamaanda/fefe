const mongoose = require('mongoose');

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped', 'suspended'],
    default: 'active'
  },
  progress: {
    completedLessons: [{
      lessonId: String,
      completedAt: Date,
      score: Number
    }],
    currentWeek: {
      type: Number,
      default: 1
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  grades: [{
    assignment: String,
    score: Number,
    maxScore: Number,
    submittedAt: Date,
    gradedAt: Date,
    feedback: String
  }],
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateUrl: String,
  completedAt: Date
}, {
  timestamps: true
});

// Compound index to prevent duplicate enrollments
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
