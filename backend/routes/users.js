const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user addresses
router.post('/addresses', [auth, [
  body('type').isIn(['shipping', 'billing']),
  body('street').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('zipCode').trim().notEmpty(),
  body('country').trim().notEmpty(),
  body('isDefault').optional().isBoolean()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.userId);
    
    // If this is set as default, remove default from other addresses of same type
    if (req.body.isDefault) {
      user.addresses.forEach(addr => {
        if (addr.type === req.body.type) {
          addr.isDefault = false;
        }
      });
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(201).json({
      message: 'Address added successfully',
      address: user.addresses[user.addresses.length - 1]
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', [auth, [
  body('newsletter').optional().isBoolean(),
  body('notifications').optional().isBoolean(),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP'])
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { preferences: { ...req.body } } },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Preferences updated successfully',
      user
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete address
router.delete('/addresses/:addressId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const addressIndex = user.addresses.findIndex(
      addr => addr._id.toString() === req.params.addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (Admin only)
router.get('/', [adminAuth], async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role (Admin only)
router.patch('/:userId/role', [adminAuth, [
  body('role').isIn(['customer', 'student', 'instructor', 'admin'])
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
