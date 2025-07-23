const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get user orders
router.get('/my-orders', [auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 10, status } = req.query;
    const filter = { user: req.user.userId };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.product', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific order
router.get('/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('items.product', 'name images price category')
      .populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders (Admin only)
router.get('/', [adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'firstName lastName email')
        .populate('items.product', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (Admin only)
router.patch('/:orderId/status', [adminAuth, [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
  body('notes').optional().trim(),
  body('trackingNumber').optional().trim(),
  body('carrier').optional().trim()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const { status, notes, trackingNumber, carrier } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status
    order.status = status;

    // Add to timeline
    order.timeline.push({
      status,
      message: notes || `Order status updated to ${status}`
    });

    // Update shipping info if provided
    if (status === 'shipped') {
      order.shipping.shippedAt = new Date();
      if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
      if (carrier) order.shipping.carrier = carrier;
    }

    if (status === 'delivered') {
      order.shipping.deliveredAt = new Date();
    }

    if (notes) {
      order.notes.admin = notes;
    }

    await order.save();

    // Send notification email to customer
    try {
      const emailService = require('../services/emailService');
      await emailService.sendOrderStatusUpdate(order);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel order
router.patch('/:orderId/cancel', auth, [
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled in current status' });
    }

    // Cancel order
    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      message: reason || 'Order cancelled by customer'
    });

    if (reason) {
      order.notes.customer = reason;
    }

    await order.save();

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const variant = product.variants.find(v => v.sku === item.variant.sku);
        if (variant) {
          variant.stock += item.quantity;
          await product.save();
        }
      }
    }

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order statistics (Admin only)
router.get('/stats/overview', adminAuth, async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue,
      monthlyRevenue
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'processing' }),
      Order.countDocuments({ status: 'shipped' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.aggregate([
        { $match: { 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      Order.aggregate([
        {
          $match: {
            'payment.status': 'paid',
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ])
    ]);

    res.json({
      totalOrders,
      ordersByStatus: {
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        thisMonth: monthlyRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
