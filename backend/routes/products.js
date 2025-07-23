const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get all products with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt', 'averageRating']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
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
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reviews.user', 'firstName lastName'),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let product = await Product.findById(identifier).populate('reviews.user', 'firstName lastName');
    
    if (!product) {
      product = await Product.findOne({ 'seo.slug': identifier }).populate('reviews.user', 'firstName lastName');
    }

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new product (Admin only)
router.post('/', [adminAuth, [
  body('name').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('category').isIn(['shirts', 'dresses', 'accessories', 'shoes', 'pants', 'jackets']),
  body('sku').trim().notEmpty(),
  body('variants').isArray({ min: 1 })
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = new Product(req.body);
    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Product with this SKU already exists' });
    }
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (Admin only)
router.put('/:id', [adminAuth, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isIn(['shirts', 'dresses', 'accessories', 'shoes', 'pants', 'jackets'])
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add product review
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
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Add review
    product.reviews.push({
      user: req.user.userId,
      rating,
      comment
    });

    // Update average rating and total reviews
    product.totalReviews = product.reviews.length;
    product.averageRating = product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.totalReviews;

    await product.save();

    res.status(201).json({
      message: 'Review added successfully',
      averageRating: product.averageRating,
      totalReviews: product.totalReviews
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check product stock
router.get('/:id/stock/:size/:color', async (req, res) => {
  try {
    const { id, size, color } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variant = product.variants.find(v => v.size === size && v.color === color);
    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    res.json({
      stock: variant.stock,
      available: variant.stock > 0
    });
  } catch (error) {
    console.error('Check stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
