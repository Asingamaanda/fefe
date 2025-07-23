const mongoose = require('mongoose');

// Product Schema for FEFE Wear
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['shirts', 'dresses', 'accessories', 'shoes', 'pants', 'jackets']
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    default: 'FEFE Wear'
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  variants: [{
    size: {
      type: String,
      required: true
    },
    color: String,
    colorCode: String,
    stock: {
      type: Number,
      required: true,
      min: 0
    },
    sku: String
  }],
  specifications: {
    material: String,
    careInstructions: String,
    origin: String,
    weight: String,
    dimensions: String
  },
  sustainability: {
    isOrganic: {
      type: Boolean,
      default: false
    },
    isRecycled: {
      type: Boolean,
      default: false
    },
    carbonNeutral: {
      type: Boolean,
      default: false
    },
    certifications: [String]
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    slug: {
      type: String,
      unique: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total stock across all variants
productSchema.virtual('totalStock').get(function() {
  return this.variants.reduce((total, variant) => total + variant.stock, 0);
});

// Generate slug from name
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.seo.slug) {
    this.seo.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
