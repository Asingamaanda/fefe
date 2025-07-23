const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Course = require('../models/Course');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fefe');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Course.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create admin user
    const adminUser = new User({
      email: 'admin@fefeholdings.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    await adminUser.save();

    // Create sample instructor
    const instructor = new User({
      email: 'instructor@ngomacurriculum.com',
      password: 'instructor123',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'instructor'
    });
    await instructor.save();

    // Create sample products
    const products = [
      {
        name: 'Organic Cotton T-Shirt',
        description: 'Soft, comfortable, and made from 100% organic cotton. Perfect for everyday wear with sustainable materials.',
        price: 29.99,
        category: 'shirts',
        sku: 'FEFE-TEE-001',
        variants: [
          { size: 'S', color: 'White', colorCode: '#FFFFFF', stock: 25, sku: 'FEFE-TEE-001-S-WHT' },
          { size: 'M', color: 'White', colorCode: '#FFFFFF', stock: 30, sku: 'FEFE-TEE-001-M-WHT' },
          { size: 'L', color: 'White', colorCode: '#FFFFFF', stock: 20, sku: 'FEFE-TEE-001-L-WHT' },
          { size: 'S', color: 'Brown', colorCode: '#8B7355', stock: 15, sku: 'FEFE-TEE-001-S-BRN' },
          { size: 'M', color: 'Brown', colorCode: '#8B7355', stock: 20, sku: 'FEFE-TEE-001-M-BRN' },
          { size: 'L', color: 'Brown', colorCode: '#8B7355', stock: 18, sku: 'FEFE-TEE-001-L-BRN' }
        ],
        specifications: {
          material: '100% Organic Cotton',
          careInstructions: 'Machine wash cold, tumble dry low',
          origin: 'Made in USA',
          weight: '150g'
        },
        sustainability: {
          isOrganic: true,
          carbonNeutral: true,
          certifications: ['GOTS Certified', 'Fair Trade']
        },
        isFeatured: true,
        tags: ['organic', 'cotton', 'sustainable', 'everyday']
      },
      {
        name: 'Sustainable Summer Dress',
        description: 'Elegant and eco-friendly summer dress made from bamboo fiber. Breathable and comfortable for warm weather.',
        price: 79.99,
        compareAtPrice: 99.99,
        category: 'dresses',
        sku: 'FEFE-DRESS-001',
        variants: [
          { size: 'XS', color: 'Cream', colorCode: '#F5F0E8', stock: 10, sku: 'FEFE-DRESS-001-XS-CRM' },
          { size: 'S', color: 'Cream', colorCode: '#F5F0E8', stock: 15, sku: 'FEFE-DRESS-001-S-CRM' },
          { size: 'M', color: 'Cream', colorCode: '#F5F0E8', stock: 20, sku: 'FEFE-DRESS-001-M-CRM' },
          { size: 'L', color: 'Cream', colorCode: '#F5F0E8', stock: 12, sku: 'FEFE-DRESS-001-L-CRM' },
          { size: 'S', color: 'Sage Green', colorCode: '#9CAF88', stock: 8, sku: 'FEFE-DRESS-001-S-SGE' },
          { size: 'M', color: 'Sage Green', colorCode: '#9CAF88', stock: 10, sku: 'FEFE-DRESS-001-M-SGE' }
        ],
        specifications: {
          material: '95% Bamboo Fiber, 5% Elastane',
          careInstructions: 'Hand wash cold, hang dry',
          origin: 'Made in Portugal',
          weight: '200g'
        },
        sustainability: {
          isOrganic: true,
          isRecycled: false,
          carbonNeutral: true,
          certifications: ['OEKO-TEX Standard 100']
        },
        isFeatured: true,
        tags: ['bamboo', 'summer', 'dress', 'sustainable', 'elegant']
      },
      {
        name: 'Recycled Denim Jacket',
        description: 'Classic denim jacket made from 100% recycled materials. Timeless style meets environmental responsibility.',
        price: 89.99,
        category: 'jackets',
        sku: 'FEFE-JACKET-001',
        variants: [
          { size: 'S', color: 'Indigo Blue', colorCode: '#4B0082', stock: 12, sku: 'FEFE-JACKET-001-S-IND' },
          { size: 'M', color: 'Indigo Blue', colorCode: '#4B0082', stock: 18, sku: 'FEFE-JACKET-001-M-IND' },
          { size: 'L', color: 'Indigo Blue', colorCode: '#4B0082', stock: 15, sku: 'FEFE-JACKET-001-L-IND' },
          { size: 'XL', color: 'Indigo Blue', colorCode: '#4B0082', stock: 8, sku: 'FEFE-JACKET-001-XL-IND' }
        ],
        specifications: {
          material: '100% Recycled Cotton Denim',
          careInstructions: 'Machine wash cold, air dry',
          origin: 'Made in Mexico',
          weight: '450g'
        },
        sustainability: {
          isRecycled: true,
          carbonNeutral: false,
          certifications: ['Global Recycled Standard (GRS)']
        },
        tags: ['denim', 'jacket', 'recycled', 'classic', 'unisex']
      },
      {
        name: 'Eco-Friendly Sneakers',
        description: 'Comfortable sneakers made from recycled ocean plastic and organic materials. Step towards a sustainable future.',
        price: 124.99,
        category: 'shoes',
        sku: 'FEFE-SHOES-001',
        variants: [
          { size: '7', color: 'White', colorCode: '#FFFFFF', stock: 6, sku: 'FEFE-SHOES-001-7-WHT' },
          { size: '8', color: 'White', colorCode: '#FFFFFF', stock: 10, sku: 'FEFE-SHOES-001-8-WHT' },
          { size: '9', color: 'White', colorCode: '#FFFFFF', stock: 12, sku: 'FEFE-SHOES-001-9-WHT' },
          { size: '10', color: 'White', colorCode: '#FFFFFF', stock: 8, sku: 'FEFE-SHOES-001-10-WHT' },
          { size: '8', color: 'Ocean Blue', colorCode: '#006994', stock: 5, sku: 'FEFE-SHOES-001-8-OCN' },
          { size: '9', color: 'Ocean Blue', colorCode: '#006994', stock: 7, sku: 'FEFE-SHOES-001-9-OCN' }
        ],
        specifications: {
          material: 'Recycled Ocean Plastic, Organic Cotton',
          careInstructions: 'Spot clean only',
          origin: 'Made in Vietnam',
          weight: '350g per shoe'
        },
        sustainability: {
          isRecycled: true,
          carbonNeutral: true,
          certifications: ['Ocean Positive', 'Fair Trade']
        },
        isFeatured: true,
        tags: ['sneakers', 'ocean plastic', 'recycled', 'comfortable', 'sustainable']
      }
    ];

    for (const productData of products) {
      const product = new Product(productData);
      await product.save();
    }

    // Create sample courses
    const courses = [
      {
        title: 'Introduction to Mathematics',
        description: 'A comprehensive introduction to fundamental mathematical concepts including algebra, geometry, and basic calculus. Perfect for building a strong mathematical foundation.',
        shortDescription: 'Master fundamental math concepts with interactive lessons and real-world applications.',
        instructor: instructor._id,
        category: 'mathematics',
        level: 'beginner',
        gradeLevel: '9',
        price: 49.99,
        duration: { weeks: 12, hours: 36 },
        curriculum: [
          {
            week: 1,
            title: 'Number Systems and Basic Operations',
            lessons: [
              {
                title: 'Understanding Number Systems',
                duration: 45,
                type: 'video',
                content: {
                  videoUrl: 'https://example.com/video1',
                  textContent: 'Introduction to different number systems...'
                }
              },
              {
                title: 'Basic Arithmetic Operations',
                duration: 30,
                type: 'reading',
                content: {
                  textContent: 'Review of addition, subtraction, multiplication, and division...'
                }
              }
            ]
          },
          {
            week: 2,
            title: 'Introduction to Algebra',
            lessons: [
              {
                title: 'Variables and Expressions',
                duration: 40,
                type: 'video',
                content: {
                  videoUrl: 'https://example.com/video2',
                  textContent: 'Understanding variables and algebraic expressions...'
                }
              }
            ]
          }
        ],
        requirements: ['Basic arithmetic skills', 'Access to calculator'],
        objectives: [
          'Understand fundamental mathematical concepts',
          'Solve basic algebraic equations',
          'Apply mathematical reasoning to real-world problems'
        ],
        skills: ['Problem solving', 'Logical thinking', 'Mathematical reasoning'],
        isFeatured: true
      },
      {
        title: 'Creative Writing Workshop',
        description: 'Develop your creative writing skills through guided exercises, peer feedback, and professional techniques. Explore various forms of creative expression.',
        shortDescription: 'Unleash your creativity and develop professional writing skills.',
        instructor: instructor._id,
        category: 'language',
        level: 'intermediate',
        gradeLevel: '10',
        price: 39.99,
        duration: { weeks: 8, hours: 24 },
        curriculum: [
          {
            week: 1,
            title: 'Foundations of Creative Writing',
            lessons: [
              {
                title: 'Finding Your Voice',
                duration: 50,
                type: 'video',
                content: {
                  videoUrl: 'https://example.com/video3',
                  textContent: 'Discovering your unique writing style...'
                }
              },
              {
                title: 'Character Development Exercise',
                duration: 60,
                type: 'assignment',
                content: {
                  textContent: 'Create a detailed character profile...'
                }
              }
            ]
          }
        ],
        requirements: ['Basic writing skills', 'Willingness to share work for feedback'],
        objectives: [
          'Develop a unique writing voice',
          'Master various creative writing techniques',
          'Complete a short story or poem collection'
        ],
        skills: ['Creative expression', 'Critical thinking', 'Communication'],
        isFeatured: true
      },
      {
        title: 'Introduction to Computer Science',
        description: 'Learn the fundamentals of computer science including programming basics, algorithms, and computational thinking. No prior experience required.',
        shortDescription: 'Start your journey into computer science with hands-on programming.',
        instructor: instructor._id,
        category: 'technology',
        level: 'beginner',
        gradeLevel: '11',
        price: 59.99,
        duration: { weeks: 16, hours: 48 },
        curriculum: [
          {
            week: 1,
            title: 'Introduction to Programming',
            lessons: [
              {
                title: 'What is Programming?',
                duration: 35,
                type: 'video',
                content: {
                  videoUrl: 'https://example.com/video4',
                  textContent: 'Understanding the basics of programming...'
                }
              },
              {
                title: 'Setting Up Your Development Environment',
                duration: 45,
                type: 'reading',
                content: {
                  textContent: 'Step-by-step guide to setting up your coding environment...'
                }
              }
            ]
          }
        ],
        requirements: ['Computer with internet access', 'No prior programming experience needed'],
        objectives: [
          'Understand basic programming concepts',
          'Write simple programs in Python',
          'Apply computational thinking to problem-solving'
        ],
        skills: ['Programming', 'Problem solving', 'Logical thinking'],
        isFeatured: true
      }
    ];

    for (const courseData of courses) {
      const course = new Course(courseData);
      await course.save();
    }

    console.log('✅ Database seeded successfully!');
    console.log(`📊 Created ${products.length} products`);
    console.log(`📚 Created ${courses.length} courses`);
    console.log(`👤 Created 2 users (1 admin, 1 instructor)`);
    console.log('\n🔑 Admin Login:');
    console.log('Email: admin@fefeholdings.com');
    console.log('Password: admin123');
    console.log('\n👨‍🏫 Instructor Login:');
    console.log('Email: instructor@ngomacurriculum.com');
    console.log('Password: instructor123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
