const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Collaborator = require('../models/Collaborator');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/collaborators/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|mp3|wav|mp4|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, audio, and video files are allowed.'));
    }
  }
});

// --- COLLABORATOR PROFILE ROUTES ---

// Get all collaborators (public, with filtering)
router.get('/', async (req, res) => {
  try {
    const {
      skill,
      genre,
      location,
      minRate,
      maxRate,
      experienceLevel,
      availability,
      page = 1,
      limit = 12,
      sortBy = 'rating'
    } = req.query;

    // Build filter object
    const filter = { profileStatus: 'active' };
    
    if (skill) filter.primarySkill = skill;
    if (genre) filter.preferredGenres = { $in: [genre] };
    if (location) {
      filter.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.country': new RegExp(location, 'i') }
      ];
    }
    if (minRate) filter['hourlyRate.min'] = { $gte: parseInt(minRate) };
    if (maxRate) filter['hourlyRate.max'] = { $lte: parseInt(maxRate) };
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (availability) filter['availability.status'] = availability;

    // Sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'rating':
        sortOptions = { 'rating.average': -1, 'rating.count': -1 };
        break;
      case 'recent':
        sortOptions = { joinDate: -1 };
        break;
      case 'experience':
        sortOptions = { yearsOfExperience: -1 };
        break;
      case 'rate_low':
        sortOptions = { 'hourlyRate.min': 1 };
        break;
      case 'rate_high':
        sortOptions = { 'hourlyRate.min': -1 };
        break;
      default:
        sortOptions = { 'rating.average': -1 };
    }

    const collaborators = await Collaborator.find(filter)
      .populate('user', 'firstName lastName email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-user.password');

    const total = await Collaborator.countDocuments(filter);

    res.json({
      collaborators,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCollaborators: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ message: 'Failed to fetch collaborators' });
  }
});

// Get collaborator profile by ID
router.get('/:id', async (req, res) => {
  try {
    const collaborator = await Collaborator.findById(req.params.id)
      .populate('user', 'firstName lastName email joinDate');

    if (!collaborator) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }

    // Increment profile views (if not the owner viewing)
    if (!req.user || req.user.id !== collaborator.user._id.toString()) {
      await collaborator.incrementProfileViews();
    }

    res.json(collaborator);
  } catch (error) {
    console.error('Get collaborator error:', error);
    res.status(500).json({ message: 'Failed to fetch collaborator profile' });
  }
});

// Create collaborator profile (authenticated users only)
router.post('/create', [auth], async (req, res) => {
  try {
    // Check if user already has a collaborator profile
    const existingCollaborator = await Collaborator.findOne({ user: req.user.id });
    if (existingCollaborator) {
      return res.status(400).json({ message: 'You already have a collaborator profile' });
    }

    const collaboratorData = {
      user: req.user.id,
      ...req.body
    };

    // Validate Vimeo portfolio if provided
    if (req.body.vimeoPortfolio?.showcaseId) {
      try {
        // Here you would validate the Vimeo showcase exists
        // For now, we'll just store it
        collaboratorData.vimeoPortfolio = req.body.vimeoPortfolio;
      } catch (vimeoError) {
        return res.status(400).json({ message: 'Invalid Vimeo showcase ID' });
      }
    }

    const newCollaborator = new Collaborator(collaboratorData);
    await newCollaborator.save();

    // Update user role to include collaborator
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { roles: 'collaborator' }
    });

    const populatedCollaborator = await Collaborator.findById(newCollaborator._id)
      .populate('user', 'firstName lastName email');

    res.status(201).json({
      message: 'Collaborator profile created successfully',
      collaborator: populatedCollaborator
    });
  } catch (error) {
    console.error('Create collaborator error:', error);
    res.status(500).json({ message: 'Failed to create collaborator profile' });
  }
});

// Update collaborator profile (owner only)
router.put('/:id', [auth], async (req, res) => {
  try {
    const collaborator = await Collaborator.findById(req.params.id);

    if (!collaborator) {
      return res.status(404).json({ message: 'Collaborator profile not found' });
    }

    // Check if user owns this profile
    if (collaborator.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only update your own profile.' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        collaborator[key] = req.body[key];
      }
    });

    await collaborator.save();

    const updatedCollaborator = await Collaborator.findById(collaborator._id)
      .populate('user', 'firstName lastName email');

    res.json({
      message: 'Profile updated successfully',
      collaborator: updatedCollaborator
    });
  } catch (error) {
    console.error('Update collaborator error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Upload portfolio files
router.post('/:id/upload', [auth, upload.array('portfolioFiles', 5)], async (req, res) => {
  try {
    const collaborator = await Collaborator.findById(req.params.id);

    if (!collaborator || collaborator.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const uploadedFiles = req.files.map(file => ({
      fileName: file.originalname,
      fileUrl: `/uploads/collaborators/${file.filename}`,
      fileType: file.mimetype,
      uploadedAt: new Date()
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
});

// Verify Vimeo portfolio
router.post('/:id/verify-vimeo', [auth], async (req, res) => {
  try {
    const { vimeoShowcaseId, vimeoUserId } = req.body;
    
    // Here you would integrate with Vimeo API to verify the showcase
    // For demo purposes, we'll simulate verification
    
    const collaborator = await Collaborator.findById(req.params.id);
    
    if (!collaborator || collaborator.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Simulate Vimeo API call to get showcase info
    const vimeoData = {
      showcaseId: vimeoShowcaseId,
      vimeoUserId: vimeoUserId,
      featuredVideos: [
        // This would come from actual Vimeo API
        {
          videoId: 'sample123',
          title: 'Sample Portfolio Video',
          description: 'Demo reel',
          thumbnail: 'https://example.com/thumb.jpg',
          duration: 120,
          uploadDate: new Date()
        }
      ]
    };

    collaborator.vimeoPortfolio = vimeoData;
    await collaborator.save();

    res.json({
      message: 'Vimeo portfolio verified successfully',
      vimeoData: vimeoData
    });
  } catch (error) {
    console.error('Vimeo verification error:', error);
    res.status(500).json({ message: 'Failed to verify Vimeo portfolio' });
  }
});

// Get collaborator's own profile
router.get('/me/profile', [auth], async (req, res) => {
  try {
    const collaborator = await Collaborator.findOne({ user: req.user.id })
      .populate('user', 'firstName lastName email');

    if (!collaborator) {
      return res.status(404).json({ message: 'Collaborator profile not found' });
    }

    res.json(collaborator);
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Search collaborators
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const searchFilter = {
      profileStatus: 'active',
      $or: [
        { stageName: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } },
        { primarySkill: { $regex: query, $options: 'i' } },
        { secondarySkills: { $in: [new RegExp(query, 'i')] } },
        { preferredGenres: { $in: [new RegExp(query, 'i')] } },
        { 'location.city': { $regex: query, $options: 'i' } },
        { 'location.country': { $regex: query, $options: 'i' } }
      ]
    };

    const collaborators = await Collaborator.find(searchFilter)
      .populate('user', 'firstName lastName')
      .sort({ 'rating.average': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Collaborator.countDocuments(searchFilter);

    res.json({
      collaborators,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalResults: total,
      searchQuery: query
    });
  } catch (error) {
    console.error('Search collaborators error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// --- ADMIN ROUTES ---

// Get all collaborators (admin only)
router.get('/admin/all', [adminAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = status ? { profileStatus: status } : {};
    
    const collaborators = await Collaborator.find(filter)
      .populate('user', 'firstName lastName email joinDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Collaborator.countDocuments(filter);

    res.json({
      collaborators,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCollaborators: total
    });
  } catch (error) {
    console.error('Admin get collaborators error:', error);
    res.status(500).json({ message: 'Failed to fetch collaborators' });
  }
});

// Update collaborator status (admin only)
router.patch('/admin/:id/status', [adminAuth], async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const collaborator = await Collaborator.findByIdAndUpdate(
      req.params.id,
      { 
        profileStatus: status,
        ...(status === 'verified' && { isVerified: true, verificationDate: new Date() })
      },
      { new: true }
    ).populate('user', 'firstName lastName email');

    if (!collaborator) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }

    res.json({
      message: `Collaborator status updated to ${status}`,
      collaborator
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// Get collaborator analytics (admin only)
router.get('/admin/analytics', [adminAuth], async (req, res) => {
  try {
    const totalCollaborators = await Collaborator.countDocuments();
    const activeCollaborators = await Collaborator.countDocuments({ profileStatus: 'active' });
    const pendingCollaborators = await Collaborator.countDocuments({ profileStatus: 'pending_review' });
    const verifiedCollaborators = await Collaborator.countDocuments({ isVerified: true });

    // Skills distribution
    const skillsDistribution = await Collaborator.aggregate([
      { $group: { _id: '$primarySkill', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly growth
    const monthlyGrowth = await Collaborator.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      overview: {
        total: totalCollaborators,
        active: activeCollaborators,
        pending: pendingCollaborators,
        verified: verifiedCollaborators,
        verificationRate: totalCollaborators > 0 ? (verifiedCollaborators / totalCollaborators * 100).toFixed(1) : 0
      },
      skillsDistribution,
      monthlyGrowth: monthlyGrowth.reverse()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

module.exports = router;
