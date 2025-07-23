const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get all courses with filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('category').optional().trim(),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('gradeLevel').optional().trim(),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 12,
      category,
      level,
      gradeLevel,
      search
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (gradeLevel) filter.gradeLevel = gradeLevel;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('instructor', 'firstName lastName')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCourses: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName email')
      .populate('reviews.user', 'firstName lastName');

    if (!course || !course.isActive) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new course (Instructor/Admin)
router.post('/', [auth, [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('shortDescription').trim().isLength({ max: 200 }),
  body('category').isIn(['mathematics', 'science', 'language', 'history', 'arts', 'technology', 'life-skills']),
  body('level').isIn(['beginner', 'intermediate', 'advanced']),
  body('gradeLevel').isIn(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']),
  body('price').isFloat({ min: 0 })
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is instructor or admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only instructors and admins can create courses' });
    }

    const courseData = {
      ...req.body,
      instructor: req.user.userId
    };

    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course
router.put('/:id', [auth, [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 })
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user owns the course or is admin
    if (course.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this course' });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName');

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add course review
router.post('/:id/reviews', [auth, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: req.user.userId,
      course: req.params.id
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'You must be enrolled to review this course' });
    }

    // Check if user already reviewed
    const existingReview = course.reviews.find(
      review => review.user.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this course' });
    }

    // Add review
    course.reviews.push({
      user: req.user.userId,
      rating,
      comment
    });

    // Update average rating
    course.averageRating = course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length;

    await course.save();

    res.status(201).json({
      message: 'Review added successfully',
      averageRating: course.averageRating,
      totalReviews: course.reviews.length
    });
  } catch (error) {
    console.error('Add course review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Course.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
