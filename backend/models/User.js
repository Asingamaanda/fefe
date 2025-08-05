const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'student', 'admin', 'instructor'],
    default: 'customer'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  addresses: [{
    type: {
      type: String,
      enum: ['shipping', 'billing'],
      required: true
    },
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  preferences: {
    newsletter: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  // AI Learning and Conversational Tracking
  aiLearning: {
    totalConversations: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    lastAIInteraction: Date,
    preferredAIPersonality: {
      type: String,
      enum: ['friendly', 'professional', 'encouraging', 'casual'],
      default: 'friendly'
    },
    conversationSessions: [{
      sessionId: String,
      startTime: Date,
      lastActivity: Date,
      messageCount: Number,
      topics: [String]
    }],
    learningProgress: {
      completedTopics: [String],
      currentDifficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
      },
      studyStreak: {
        type: Number,
        default: 0
      },
      lastStudyDate: Date
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
