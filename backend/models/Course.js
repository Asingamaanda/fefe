const mongoose = require('mongoose');

// Course Schema for Ngoma Curriculum
const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['mathematics', 'science', 'language', 'history', 'arts', 'technology', 'life-skills']
  },
  level: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  gradeLevel: {
    type: String,
    required: true,
    enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    weeks: Number,
    hours: Number
  },
  thumbnail: {
    url: String,
    alt: String
  },
  curriculum: [{
    week: Number,
    title: String,
    lessons: [{
      title: String,
      duration: Number, // in minutes
      type: {
        type: String,
        enum: ['video', 'reading', 'quiz', 'assignment', 'live-session']
      },
      content: {
        videoUrl: String,
        textContent: String,
        resources: [String],
        questions: [{
          question: String,
          type: {
            type: String,
            enum: ['multiple-choice', 'true-false', 'short-answer', 'essay']
          },
          options: [String],
          correctAnswer: String,
          points: Number
        }]
      }
    }]
  }],
  requirements: [String],
  objectives: [String],
  skills: [String],
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'audio']
    },
    url: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  enrollmentCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
