const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Collaboration = require('../models/Collaboration');
const Collaborator = require('../models/Collaborator');
const User = require('../models/User');

const router = express.Router();

// --- COLLABORATION PROJECT ROUTES ---

// Get all collaboration projects (public, filtered)
router.get('/', async (req, res) => {
  try {
    const {
      status = 'open_for_applications',
      projectType,
      genre,
      skill,
      budget,
      collaborationType,
      location,
      page = 1,
      limit = 12,
      sortBy = 'recent'
    } = req.query;

    // Build filter
    const filter = { status: { $in: ['open_for_applications', 'in_progress'] } };
    
    if (status !== 'all') filter.status = status;
    if (projectType) filter.projectType = projectType;
    if (genre) filter.genre = genre;
    if (skill) filter['skillsNeeded.skill'] = skill;
    if (budget) {
      const [min, max] = budget.split('-').map(Number);
      filter['budget.total'] = { $gte: min, ...(max && { $lte: max }) };
    }
    if (collaborationType) filter.collaborationType = collaborationType;
    if (location) {
      filter.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.country': new RegExp(location, 'i') }
      ];
    }

    // Sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'budget_high':
        sortOptions = { 'budget.total': -1 };
        break;
      case 'budget_low':
        sortOptions = { 'budget.total': 1 };
        break;
      case 'deadline':
        sortOptions = { 'timeline.endDate': 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const collaborations = await Collaboration.find(filter)
      .populate('initiator', 'stageName primarySkill rating location')
      .populate('participants.collaborator', 'stageName primarySkill rating')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-contract -payments'); // Hide sensitive data

    const total = await Collaboration.countDocuments(filter);

    res.json({
      collaborations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProjects: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Get collaborations error:', error);
    res.status(500).json({ message: 'Failed to fetch collaboration projects' });
  }
});

// Get collaboration project by ID
router.get('/:id', async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id)
      .populate('initiator', 'stageName primarySkill rating location vimeoPortfolio')
      .populate('participants.collaborator', 'stageName primarySkill rating location')
      .populate('skillsNeeded.filledBy', 'stageName primarySkill rating');

    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration project not found' });
    }

    // Increment views (if not the owner viewing)
    if (!req.user || req.user.id !== collaboration.initiator.user?.toString()) {
      await collaboration.incrementViews();
    }

    // Hide sensitive data unless user is participant
    let responseData = collaboration.toObject();
    const isParticipant = req.user && (
      collaboration.initiator._id.toString() === req.user.collaboratorId ||
      collaboration.participants.some(p => p.collaborator._id.toString() === req.user.collaboratorId)
    );

    if (!isParticipant) {
      delete responseData.contract;
      delete responseData.payments;
      delete responseData.projectFiles;
    }

    res.json(responseData);
  } catch (error) {
    console.error('Get collaboration error:', error);
    res.status(500).json({ message: 'Failed to fetch collaboration project' });
  }
});

// Create new collaboration project (collaborators only)
router.post('/create', [auth], async (req, res) => {
  try {
    // Get user's collaborator profile
    const collaborator = await Collaborator.findOne({ user: req.user.id });
    if (!collaborator) {
      return res.status(403).json({ message: 'You need a collaborator profile to create projects' });
    }

    const collaborationData = {
      ...req.body,
      initiator: collaborator._id
    };

    // Calculate FEFE commission
    const total = collaborationData.budget.total;
    const commissionPercentage = collaborationData.budget.fefeCommission?.percentage || 15;
    collaborationData.budget.fefeCommission = {
      percentage: commissionPercentage,
      amount: (total * commissionPercentage) / 100
    };

    const newCollaboration = new Collaboration(collaborationData);
    await newCollaboration.save();

    const populatedCollaboration = await Collaboration.findById(newCollaboration._id)
      .populate('initiator', 'stageName primarySkill rating location');

    res.status(201).json({
      message: 'Collaboration project created successfully',
      collaboration: populatedCollaboration
    });
  } catch (error) {
    console.error('Create collaboration error:', error);
    res.status(500).json({ message: 'Failed to create collaboration project' });
  }
});

// Apply to collaboration project
router.post('/:id/apply', [auth], async (req, res) => {
  try {
    const { skillRole, proposedRate, coverMessage } = req.body;

    // Get user's collaborator profile
    const collaborator = await Collaborator.findOne({ user: req.user.id });
    if (!collaborator) {
      return res.status(403).json({ message: 'You need a collaborator profile to apply' });
    }

    const collaboration = await Collaboration.findById(req.params.id);
    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration project not found' });
    }

    // Check if already applied
    const alreadyApplied = collaboration.participants.some(
      p => p.collaborator.toString() === collaborator._id.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({ message: 'You have already applied to this project' });
    }

    // Check if the skill is needed and not filled
    const neededSkill = collaboration.skillsNeeded.find(
      skill => skill.skill === skillRole && !skill.isFilled
    );

    if (!neededSkill) {
      return res.status(400).json({ message: 'This skill role is not available or already filled' });
    }

    // Add participant
    collaboration.participants.push({
      collaborator: collaborator._id,
      role: skillRole,
      status: 'invited',
      contribution: coverMessage,
      agreedRate: proposedRate
    });

    collaboration.applications += 1;
    await collaboration.save();

    // Populate the response
    const updatedCollaboration = await Collaboration.findById(collaboration._id)
      .populate('participants.collaborator', 'stageName primarySkill rating location');

    res.json({
      message: 'Application submitted successfully',
      collaboration: updatedCollaboration
    });
  } catch (error) {
    console.error('Apply to collaboration error:', error);
    res.status(500).json({ message: 'Failed to submit application' });
  }
});

// Accept/Decline application (project initiator only)
router.patch('/:id/participants/:participantId', [auth], async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'declined'

    const collaboration = await Collaboration.findById(req.params.id);
    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration project not found' });
    }

    // Check if user is the initiator
    const userCollaborator = await Collaborator.findOne({ user: req.user.id });
    if (!userCollaborator || collaboration.initiator.toString() !== userCollaborator._id.toString()) {
      return res.status(403).json({ message: 'Only the project initiator can manage applications' });
    }

    // Find participant
    const participant = collaboration.participants.id(req.params.participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    participant.status = status;
    participant.respondedAt = new Date();

    // If accepted, mark the skill as filled and set joinedAt
    if (status === 'accepted') {
      participant.joinedAt = new Date();
      
      // Mark skill as filled
      const skill = collaboration.skillsNeeded.find(s => s.skill === participant.role);
      if (skill) {
        skill.isFilled = true;
        skill.filledBy = participant.collaborator;
      }

      // Check if project is fully staffed
      if (collaboration.isFullyStaffed()) {
        collaboration.status = 'in_progress';
      }
    }

    await collaboration.save();

    const updatedCollaboration = await Collaboration.findById(collaboration._id)
      .populate('participants.collaborator', 'stageName primarySkill rating location');

    res.json({
      message: `Application ${status} successfully`,
      collaboration: updatedCollaboration
    });
  } catch (error) {
    console.error('Manage application error:', error);
    res.status(500).json({ message: 'Failed to manage application' });
  }
});

// Get user's collaborations (as initiator or participant)
router.get('/me/projects', [auth], async (req, res) => {
  try {
    const collaborator = await Collaborator.findOne({ user: req.user.id });
    if (!collaborator) {
      return res.status(404).json({ message: 'Collaborator profile not found' });
    }

    const { status, role = 'all', page = 1, limit = 10 } = req.query;

    // Build filter based on role
    let filter = {};
    if (role === 'initiator') {
      filter.initiator = collaborator._id;
    } else if (role === 'participant') {
      filter['participants.collaborator'] = collaborator._id;
    } else {
      filter.$or = [
        { initiator: collaborator._id },
        { 'participants.collaborator': collaborator._id }
      ];
    }

    if (status) filter.status = status;

    const collaborations = await Collaboration.find(filter)
      .populate('initiator', 'stageName primarySkill rating')
      .populate('participants.collaborator', 'stageName primarySkill rating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Collaboration.countDocuments(filter);

    res.json({
      collaborations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProjects: total
    });
  } catch (error) {
    console.error('Get my collaborations error:', error);
    res.status(500).json({ message: 'Failed to fetch your collaborations' });
  }
});

// Update collaboration project (initiator only)
router.put('/:id', [auth], async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id);
    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration project not found' });
    }

    // Check if user is the initiator
    const userCollaborator = await Collaborator.findOne({ user: req.user.id });
    if (!userCollaborator || collaboration.initiator.toString() !== userCollaborator._id.toString()) {
      return res.status(403).json({ message: 'Only the project initiator can update this project' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'skillsNeeded', 'timeline', 'budget',
      'collaborationType', 'location', 'tags'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        collaboration[field] = req.body[field];
      }
    });

    // Recalculate FEFE commission if budget changed
    if (req.body.budget) {
      collaboration.calculateFefeCommission();
    }

    await collaboration.save();

    const updatedCollaboration = await Collaboration.findById(collaboration._id)
      .populate('initiator', 'stageName primarySkill rating location');

    res.json({
      message: 'Collaboration project updated successfully',
      collaboration: updatedCollaboration
    });
  } catch (error) {
    console.error('Update collaboration error:', error);
    res.status(500).json({ message: 'Failed to update collaboration project' });
  }
});

// Search collaboration projects
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const searchFilter = {
      status: { $in: ['open_for_applications', 'in_progress'] },
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { projectType: { $regex: query, $options: 'i' } },
        { genre: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
        { 'skillsNeeded.skill': { $regex: query, $options: 'i' } }
      ]
    };

    const collaborations = await Collaboration.find(searchFilter)
      .populate('initiator', 'stageName primarySkill rating location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-contract -payments');

    const total = await Collaboration.countDocuments(searchFilter);

    res.json({
      collaborations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalResults: total,
      searchQuery: query
    });
  } catch (error) {
    console.error('Search collaborations error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Complete collaboration and trigger reviews
router.patch('/:id/complete', [auth], async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id);
    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration project not found' });
    }

    // Check if user is the initiator
    const userCollaborator = await Collaborator.findOne({ user: req.user.id });
    if (!userCollaborator || collaboration.initiator.toString() !== userCollaborator._id.toString()) {
      return res.status(403).json({ message: 'Only the project initiator can complete the project' });
    }

    collaboration.status = 'completed';
    await collaboration.save();

    // Update collaborator stats
    const allParticipants = [collaboration.initiator, ...collaboration.participants.map(p => p.collaborator)];
    
    for (const participantId of allParticipants) {
      await Collaborator.findByIdAndUpdate(participantId, {
        $inc: { 
          completedCollaborations: 1,
          activeCollaborations: -1
        }
      });
    }

    res.json({
      message: 'Collaboration marked as completed',
      collaboration
    });
  } catch (error) {
    console.error('Complete collaboration error:', error);
    res.status(500).json({ message: 'Failed to complete collaboration' });
  }
});

module.exports = router;
