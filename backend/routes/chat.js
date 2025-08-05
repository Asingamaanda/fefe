const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/chat'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image, PDF, DOC, and TXT files are allowed!'));
    }
});

// Store chat messages temporarily (in production, use a database)
const chatMessages = [];

// Store online users and their status
const onlineUsers = new Map();

// Store typing status
const typingUsers = new Map();

// Get chat history
router.get('/history', auth, async (req, res) => {
    try {
        res.json(chatMessages.slice(-50)); // Get last 50 messages
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat history' });
    }
});

// Store chat message
router.post('/message', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const newMessage = {
            userId: req.user.id,
            userName: req.user.name,
            message,
            timestamp: new Date(),
            id: Date.now().toString(),
            read: new Map(), // Track read status per user
            attachments: [] // Store file attachments
        };
        chatMessages.push(newMessage);
        res.json(newMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error saving message' });
    }
});

// Upload file attachment
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileInfo = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: `/uploads/chat/${req.file.filename}`,
            mimetype: req.file.mimetype,
            size: req.file.size
        };

        res.json(fileInfo);
    } catch (error) {
        res.status(500).json({ message: 'Error uploading file' });
    }
});

// Mark message as read
router.post('/read/:messageId', auth, async (req, res) => {
    try {
        const message = chatMessages.find(m => m.id === req.params.messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        message.read.set(req.user.id, new Date());
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error marking message as read' });
    }
});

// Get online users
router.get('/online', auth, async (req, res) => {
    try {
        const users = Array.from(onlineUsers.entries()).map(([userId, status]) => ({
            userId,
            status,
            lastSeen: status === 'online' ? new Date() : null
        }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching online users' });
    }
});

module.exports = router;
