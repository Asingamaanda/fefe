const mongoose = require('mongoose');

// Collaborator Profile Schema
const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Profile Information
  stageName: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    required: true,
    maxlength: 1000
  },
  location: {
    city: String,
    country: String,
    timezone: String
  },
  
  // Talent & Skills
  primarySkill: {
    type: String,
    required: true,
    enum: [
      'guitarist', 'bassist', 'drummer', 'vocalist', 'keyboardist', 'producer',
      'songwriter', 'audio_engineer', 'video_editor', 'photographer', 
      'graphic_designer', 'animator', 'dancer', 'choreographer', 'actor',
      'director', 'writer', 'composer', 'dj', 'rapper', 'beatmaker', 'other'
    ]
  },
  secondarySkills: [{
    type: String,
    enum: [
      'guitarist', 'bassist', 'drummer', 'vocalist', 'keyboardist', 'producer',
      'songwriter', 'audio_engineer', 'video_editor', 'photographer', 
      'graphic_designer', 'animator', 'dancer', 'choreographer', 'actor',
      'director', 'writer', 'composer', 'dj', 'rapper', 'beatmaker', 'other'
    ]
  }],
  
  // Experience & Rates
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'professional', 'expert'],
    required: true
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    max: 50
  },
  hourlyRate: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    currency: { type: String, default: 'USD' }
  },
  projectRate: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  
  // Portfolio
  vimeoPortfolio: {
    vimeoUserId: String,
    showcaseId: String, // Vimeo Showcase ID
    featuredVideos: [{
      videoId: String,
      title: String,
      description: String,
      thumbnail: String,
      duration: Number,
      uploadDate: Date
    }]
  },
  additionalPortfolio: {
    website: String,
    soundcloud: String,
    spotify: String,
    instagram: String,
    youtube: String,
    bandcamp: String
  },
  
  // Collaboration Preferences
  collaborationTypes: [{
    type: String,
    enum: [
      'single_track', 'ep_project', 'album', 'live_performance', 
      'music_video', 'commercial', 'film_score', 'podcast', 
      'remix', 'ghost_production', 'session_work', 'teaching'
    ]
  }],
  availableForRemote: {
    type: Boolean,
    default: true
  },
  availableForInPerson: {
    type: Boolean,
    default: false
  },
  preferredGenres: [{
    type: String,
    enum: [
      'pop', 'rock', 'hip_hop', 'r_and_b', 'jazz', 'classical', 'electronic',
      'country', 'folk', 'blues', 'reggae', 'latin', 'world', 'experimental',
      'ambient', 'house', 'techno', 'trap', 'afrobeat', 'amapiano', 'other'
    ]
  }],
  
  // Verification & Status
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  profileStatus: {
    type: String,
    enum: ['draft', 'pending_review', 'active', 'suspended', 'inactive'],
    default: 'draft'
  },
  
  // Performance Metrics
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  completedCollaborations: { type: Number, default: 0 },
  activeCollaborations: { type: Number, default: 0 },
  responseTime: { type: Number }, // Average response time in hours
  
  // Availability
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    nextAvailableDate: Date,
    workingHours: {
      timezone: String,
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    }
  },
  
  // FEFE Platform Data
  joinDate: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  profileViews: { type: Number, default: 0 },
  profileViewsThisMonth: { type: Number, default: 0 },
  featuredUntil: Date, // For premium/featured listings
  
  // Communication Preferences
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    discord: { type: Boolean, default: false },
    preferredMethod: {
      type: String,
      enum: ['email', 'platform_messaging', 'whatsapp', 'discord'],
      default: 'platform_messaging'
    }
  }
}, {
  timestamps: true
});

// Indexes for search and performance
collaboratorSchema.index({ primarySkill: 1, location: 1 });
collaboratorSchema.index({ 'rating.average': -1 });
collaboratorSchema.index({ profileStatus: 1, isVerified: 1 });
collaboratorSchema.index({ 'hourlyRate.min': 1, 'hourlyRate.max': 1 });
collaboratorSchema.index({ preferredGenres: 1 });
collaboratorSchema.index({ experienceLevel: 1 });

// Virtual for full name
collaboratorSchema.virtual('fullPortfolioUrl').get(function() {
  if (this.vimeoPortfolio.showcaseId) {
    return `https://vimeo.com/showcase/${this.vimeoPortfolio.showcaseId}`;
  }
  return null;
});

// Methods
collaboratorSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

collaboratorSchema.methods.incrementProfileViews = function() {
  this.profileViews += 1;
  this.profileViewsThisMonth += 1;
  return this.save();
};

module.exports = mongoose.model('Collaborator', collaboratorSchema);
