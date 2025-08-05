const mongoose = require('mongoose');

// Collaboration Project Schema
const collaborationSchema = new mongoose.Schema({
  // Project Basics
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  projectType: {
    type: String,
    required: true,
    enum: [
      'single_track', 'ep_project', 'album', 'live_performance', 
      'music_video', 'commercial', 'film_score', 'podcast', 
      'remix', 'ghost_production', 'session_work', 'teaching'
    ]
  },
  genre: {
    type: String,
    required: true,
    enum: [
      'pop', 'rock', 'hip_hop', 'r_and_b', 'jazz', 'classical', 'electronic',
      'country', 'folk', 'blues', 'reggae', 'latin', 'world', 'experimental',
      'ambient', 'house', 'techno', 'trap', 'afrobeat', 'amapiano', 'other'
    ]
  },
  
  // Participants
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collaborator',
    required: true
  },
  participants: [{
    collaborator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator',
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: [
        'guitarist', 'bassist', 'drummer', 'vocalist', 'keyboardist', 'producer',
        'songwriter', 'audio_engineer', 'video_editor', 'photographer', 
        'graphic_designer', 'animator', 'dancer', 'choreographer', 'actor',
        'director', 'writer', 'composer', 'dj', 'rapper', 'beatmaker', 'other'
      ]
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'completed', 'cancelled'],
      default: 'invited'
    },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: Date,
    joinedAt: Date,
    contribution: String, // What they'll contribute
    agreedRate: {
      amount: Number,
      type: { type: String, enum: ['hourly', 'project', 'percentage'] },
      currency: { type: String, default: 'USD' }
    }
  }],
  
  // Requirements & Skills Needed
  skillsNeeded: [{
    skill: {
      type: String,
      required: true,
      enum: [
        'guitarist', 'bassist', 'drummer', 'vocalist', 'keyboardist', 'producer',
        'songwriter', 'audio_engineer', 'video_editor', 'photographer', 
        'graphic_designer', 'animator', 'dancer', 'choreographer', 'actor',
        'director', 'writer', 'composer', 'dj', 'rapper', 'beatmaker', 'other'
      ]
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'professional', 'expert'],
      required: true
    },
    description: String,
    isFilled: { type: Boolean, default: false },
    filledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator'
    }
  }],
  
  // Project Timeline & Budget
  timeline: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    milestones: [{
      title: String,
      description: String,
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'overdue'],
        default: 'pending'
      },
      assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collaborator'
      }]
    }]
  },
  
  budget: {
    total: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paymentStructure: {
      type: String,
      enum: ['upfront', '50_50', 'milestone_based', 'completion'],
      default: 'milestone_based'
    },
    fefeCommission: {
      percentage: { type: Number, default: 15 }, // FEFE's cut
      amount: Number
    },
    breakdown: [{
      participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collaborator'
      },
      amount: Number,
      paymentType: {
        type: String,
        enum: ['hourly', 'project', 'percentage']
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'disputed'],
        default: 'pending'
      }
    }]
  },
  
  // Project Status & Management
  status: {
    type: String,
    enum: [
      'draft', 'open_for_applications', 'in_progress', 'review', 
      'completed', 'cancelled', 'disputed', 'on_hold'
    ],
    default: 'draft'
  },
  
  // Collaboration Format
  collaborationType: {
    type: String,
    enum: ['remote', 'in_person', 'hybrid'],
    required: true
  },
  location: {
    city: String,
    country: String,
    isRequired: Boolean // For in-person collaborations
  },
  
  // Communication & Files
  communicationChannel: {
    platform: {
      type: String,
      enum: ['fefe_chat', 'discord', 'slack', 'whatsapp', 'email'],
      default: 'fefe_chat'
    },
    channelId: String,
    inviteLink: String
  },
  
  projectFiles: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator'
    },
    uploadedAt: { type: Date, default: Date.now },
    isPublic: { type: Boolean, default: false },
    version: { type: Number, default: 1 }
  }],
  
  // Contract & Legal
  contract: {
    templateUsed: String,
    customTerms: String,
    signedBy: [{
      collaborator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collaborator'
      },
      signedAt: Date,
      ipAddress: String,
      digitalSignature: String
    }],
    isFullySigned: { type: Boolean, default: false }
  },
  
  // Final Deliverables
  deliverables: [{
    title: String,
    description: String,
    fileUrl: String,
    vimeoVideoId: String,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator'
    },
    submittedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator'
    },
    approvedAt: Date,
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'revision_needed'],
      default: 'draft'
    }
  }],
  
  // Reviews & Ratings (after completion)
  reviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator'
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator'
    },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    categories: {
      communication: { type: Number, min: 1, max: 5 },
      creativity: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 }
    },
    isPublic: { type: Boolean, default: true },
    reviewedAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  views: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },
  featuredUntil: Date,
  tags: [String], // For search optimization
  
  // Payment Tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'partially_paid', 'fully_paid', 'disputed', 'refunded'],
    default: 'pending'
  },
  payments: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaborator'
    },
    amount: Number,
    currency: { type: String, default: 'USD' },
    paymentMethod: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    fefeCommissionAmount: Number
  }]
}, {
  timestamps: true
});

// Indexes
collaborationSchema.index({ status: 1, genre: 1 });
collaborationSchema.index({ 'skillsNeeded.skill': 1, 'skillsNeeded.isFilled': 1 });
collaborationSchema.index({ 'timeline.startDate': 1, 'timeline.endDate': 1 });
collaborationSchema.index({ budget: 1 });
collaborationSchema.index({ collaborationType: 1, 'location.city': 1 });
collaborationSchema.index({ tags: 1 });

// Methods
collaborationSchema.methods.calculateFefeCommission = function() {
  const commission = (this.budget.total * this.budget.fefeCommission.percentage) / 100;
  this.budget.fefeCommission.amount = commission;
  return commission;
};

collaborationSchema.methods.isFullyStaffed = function() {
  return this.skillsNeeded.every(skill => skill.isFilled);
};

collaborationSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Collaboration', collaborationSchema);
