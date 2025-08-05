const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploads');
const aiLearningRoutes = require('./routes/ai-learning');
const collaboratorRoutes = require('./routes/collaborators');
const collaborationRoutes = require('./routes/collaborations');

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fefe', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/ai-learning', aiLearningRoutes);
app.use('/api/chat', chatRoutes);

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentUser = null;

  socket.on('join', (userData) => {
    currentUser = {
      id: userData.userId,
      name: userData.userName
    };
    
    // Add user to online users
    onlineUsers.set(currentUser.id, {
      status: 'online',
      socketId: socket.id,
      lastSeen: new Date()
    });

    socket.join(`user_${currentUser.id}`);
    
    // Broadcast user online status
    io.emit('user status', {
      userId: currentUser.id,
      status: 'online',
      lastSeen: new Date()
    });
  });

  socket.on('chat message', async (data) => {
    try {
      const message = {
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        timestamp: new Date(),
        id: Date.now().toString(),
        attachments: data.attachments || [],
        read: new Map()
      };

      // Broadcast to all connected clients
      io.emit('chat message', message);

      // Send notification to all other users
      socket.broadcast.emit('new message notification', {
        from: data.userName,
        preview: data.message.substring(0, 50)
      });
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Error processing message' });
    }
  });

  // Handle typing status
  socket.on('typing', (data) => {
    typingUsers.set(data.userId, {
      userName: data.userName,
      timestamp: new Date()
    });
    socket.broadcast.emit('user typing', {
      userId: data.userId,
      userName: data.userName
    });
  });

  socket.on('stop typing', (data) => {
    typingUsers.delete(data.userId);
    socket.broadcast.emit('user stop typing', {
      userId: data.userId
    });
  });

  // Handle read receipts
  socket.on('message read', (data) => {
    const message = chatMessages.find(m => m.id === data.messageId);
    if (message) {
      message.read.set(data.userId, new Date());
      io.emit('read receipt', {
        messageId: data.messageId,
        userId: data.userId,
        timestamp: new Date()
      });
    }
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      onlineUsers.set(currentUser.id, {
        status: 'offline',
        lastSeen: new Date()
      });

      // Broadcast user offline status
      io.emit('user status', {
        userId: currentUser.id,
        status: 'offline',
        lastSeen: new Date()
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FEFE Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to FEFE Holdings API',
    version: '1.0.0',
    services: {
      'FEFE Wear': 'E-commerce platform for sustainable fashion',
      'Ngoma Curriculum': 'Educational platform for interactive learning',
      'AI Education': 'AI-powered educational solutions',
      'Web Solutions': 'Professional web development services'
    },
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      courses: '/api/courses',
      enrollments: '/api/enrollments',
      payments: '/api/payments',
      users: '/api/users',
      uploads: '/api/uploads',
      aiLearning: '/api/ai-learning'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 FEFE Backend API is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`💬 WebSocket server is running`);
});

module.exports = app;
