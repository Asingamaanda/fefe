const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Ensure upload directories exist
const uploadPaths = {
  products: path.join(__dirname, '../uploads/products'),
  courses: path.join(__dirname, '../uploads/courses'),
  profiles: path.join(__dirname, '../uploads/profiles'),
  general: path.join(__dirname, '../uploads/general')
};

Object.values(uploadPaths).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for different upload types
const createMulterConfig = (destination, fileFilter) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, destination);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    }),
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
      files: 10 // Maximum 10 files per request
    },
    fileFilter: fileFilter || ((req, file, cb) => {
      // Default: Allow images and common document types
      const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images and documents are allowed!'));
      }
    })
  });
};

// Image-only filter
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure multer instances
const uploadProduct = createMulterConfig(uploadPaths.products, imageFilter);
const uploadCourse = createMulterConfig(uploadPaths.courses);
const uploadProfile = createMulterConfig(uploadPaths.profiles, imageFilter);
const uploadGeneral = createMulterConfig(uploadPaths.general);

// Upload product images
router.post('/products', [auth, uploadProduct.array('images', 5)], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: `/uploads/products/${file.filename}`,
      uploadedAt: new Date()
    }));

    res.json({
      message: 'Product images uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Product upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Upload course materials
router.post('/courses', [auth, uploadCourse.array('materials', 10)], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype,
      url: `/uploads/courses/${file.filename}`,
      uploadedAt: new Date()
    }));

    res.json({
      message: 'Course materials uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Course upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Upload profile picture
router.post('/profile', [auth, uploadProfile.single('avatar')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadedFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: `/uploads/profiles/${req.file.filename}`,
      uploadedAt: new Date()
    };

    // Here you could update the user's profile with the new avatar URL
    // await User.findByIdAndUpdate(req.user.userId, { avatar: uploadedFile.url });

    res.json({
      message: 'Profile picture uploaded successfully',
      file: uploadedFile
    });
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// General file upload
router.post('/general', [auth, uploadGeneral.array('files', 5)], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype,
      url: `/uploads/general/${file.filename}`,
      uploadedAt: new Date()
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('General upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Admin: Upload multiple files for any purpose
router.post('/admin', [adminAuth, uploadGeneral.array('files', 20)], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { category = 'general' } = req.body;
    
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype,
      category,
      url: `/uploads/general/${file.filename}`,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    }));

    res.json({
      message: 'Admin files uploaded successfully',
      files: uploadedFiles,
      totalFiles: uploadedFiles.length,
      totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
    });
  } catch (error) {
    console.error('Admin upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Get uploaded files list
router.get('/files', auth, async (req, res) => {
  try {
    const { category = 'general', page = 1, limit = 20 } = req.query;
    
    // This is a simple file listing - in production you'd want to store file metadata in database
    const uploadDir = uploadPaths[category] || uploadPaths.general;
    
    if (!fs.existsSync(uploadDir)) {
      return res.json({ files: [], total: 0 });
    }

    const files = fs.readdirSync(uploadDir).map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        uploadedAt: stats.birthtime,
        url: `/uploads/${category}/${filename}`
      };
    });

    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = files.slice(startIndex, endIndex);

    res.json({
      files: paginatedFiles,
      total: files.length,
      page: parseInt(page),
      totalPages: Math.ceil(files.length / limit)
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Failed to get files' });
  }
});

// Delete uploaded file
router.delete('/files/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { category = 'general' } = req.query;
    
    const uploadDir = uploadPaths[category] || uploadPaths.general;
    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    fs.unlinkSync(filePath);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

// Get file info
router.get('/files/:filename/info', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { category = 'general' } = req.query;
    
    const uploadDir = uploadPaths[category] || uploadPaths.general;
    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    
    res.json({
      filename,
      size: stats.size,
      uploadedAt: stats.birthtime,
      lastModified: stats.mtime,
      url: `/uploads/${category}/${filename}`,
      type: path.extname(filename)
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ message: 'Failed to get file info' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected field name' });
    }
  }
  
  if (error.message) {
    return res.status(400).json({ message: error.message });
  }
  
  next(error);
});

module.exports = router;
