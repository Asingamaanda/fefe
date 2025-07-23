const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Enroll in course
router.post('/', [auth, [
  body('courseId').notEmpty().isMongoId()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.body;
    const studentId = req.user.userId;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course || !course.isActive) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create enrollment
    const enrollment = new Enrollment({
      student: studentId,
      course: courseId
    });

    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 }
    });

    // Populate enrollment for response
    await enrollment.populate('course', 'title instructor duration');
    await enrollment.populate('student', 'firstName lastName email');

    // Send enrollment confirmation email
    try {
      await emailService.sendEnrollmentConfirmation(enrollment);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user enrollments
router.get('/my-courses', [auth, [
  query('status').optional().isIn(['active', 'completed', 'dropped', 'suspended'])
]], async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { student: req.user.userId };

    if (status) {
      filter.status = status;
    }

    const enrollments = await Enrollment.find(filter)
      .populate('course', 'title description thumbnail duration category level averageRating')
      .sort({ enrollmentDate: -1 });

    res.json({ enrollments });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific enrollment
router.get('/:id', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course')
      .populate('student', 'firstName lastName email');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if user owns this enrollment
    if (enrollment.student._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ enrollment });
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update enrollment progress
router.put('/:id/progress', [auth, [
  body('lessonId').notEmpty(),
  body('completed').isBoolean(),
  body('score').optional().isInt({ min: 0, max: 100 })
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lessonId, completed, score } = req.body;
    
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if user owns this enrollment
    if (enrollment.student.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (completed) {
      // Check if lesson already completed
      const existingLesson = enrollment.progress.completedLessons.find(
        lesson => lesson.lessonId === lessonId
      );

      if (!existingLesson) {
        enrollment.progress.completedLessons.push({
          lessonId,
          completedAt: new Date(),
          score: score || 0
        });
      } else {
        // Update existing lesson
        existingLesson.score = score || existingLesson.score;
      }

      // Calculate overall progress (simplified)
      const course = await Course.findById(enrollment.course);
      const totalLessons = course.curriculum.reduce((total, week) => total + week.lessons.length, 0);
      enrollment.progress.overallProgress = Math.round((enrollment.progress.completedLessons.length / totalLessons) * 100);

      // Check if course is completed
      if (enrollment.progress.overallProgress >= 100 && enrollment.status === 'active') {
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
        // Here you could generate a certificate
      }
    }

    await enrollment.save();

    res.json({
      message: 'Progress updated successfully',
      progress: enrollment.progress
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit assignment/grade
router.post('/:id/grades', [auth, [
  body('assignment').notEmpty(),
  body('submissionContent').optional(),
  body('submissionUrl').optional().isURL()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignment, submissionContent, submissionUrl } = req.body;
    
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if user owns this enrollment
    if (enrollment.student.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Add grade entry (initially ungraded)
    enrollment.grades.push({
      assignment,
      submittedAt: new Date(),
      // Instructor will grade later
    });

    await enrollment.save();

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission: enrollment.grades[enrollment.grades.length - 1]
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Drop course
router.patch('/:id/drop', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if user owns this enrollment
    if (enrollment.student.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (enrollment.status !== 'active') {
      return res.status(400).json({ message: 'Can only drop active enrollments' });
    }

    enrollment.status = 'dropped';
    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(enrollment.course, {
      $inc: { enrollmentCount: -1 }
    });

    res.json({
      message: 'Successfully dropped course',
      enrollment
    });
  } catch (error) {
    console.error('Drop course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrollment statistics (for instructors/admin)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    if (!['instructor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const filter = req.user.role === 'instructor' 
      ? { 'course.instructor': req.user.userId }
      : {};

    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      avgProgress
    ] = await Promise.all([
      Enrollment.countDocuments(filter),
      Enrollment.countDocuments({ ...filter, status: 'active' }),
      Enrollment.countDocuments({ ...filter, status: 'completed' }),
      Enrollment.aggregate([
        { $match: filter },
        { $group: { _id: null, avgProgress: { $avg: '$progress.overallProgress' } } }
      ])
    ]);

    res.json({
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      averageProgress: avgProgress[0]?.avgProgress || 0,
      completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0
    });
  } catch (error) {
    console.error('Get enrollment stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
