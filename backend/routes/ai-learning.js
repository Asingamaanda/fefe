const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// Middleware to check if AI service is available
const checkAIService = async (req, res, next) => {
  try {
    await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    next();
  } catch (error) {
    return res.status(503).json({
      message: 'AI Learning Service is currently unavailable',
      error: 'SERVICE_UNAVAILABLE'
    });
  }
};

// Get AI service health status
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`);
    res.json({
      status: 'connected',
      ai_service: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      message: 'AI Learning Service is not available'
    });
  }
});

// Upload PDF for AI learning
router.post('/upload-pdf', [auth, checkAIService], async (req, res) => {
  try {
    // Forward the file upload request to AI service
    const formData = new FormData();
    
    // Note: In a real implementation, you'd handle file upload here
    // and forward to AI service, or save to database with metadata
    
    res.json({
      message: 'Please use the AI Learning interface to upload PDFs',
      ai_service_url: `${AI_SERVICE_URL}`,
      integration: 'available'
    });
  } catch (error) {
    console.error('AI PDF upload error:', error);
    res.status(500).json({ message: 'Failed to process PDF upload' });
  }
});

// Ask AI a question (with user tracking)
router.post('/ask', [auth, checkAIService], async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user.userId;

    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    // Forward question to AI service with user context
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/ask_ai`, {
      question,
      user_id: userId
    });

    // Optionally save the interaction to database
    const user = await User.findById(userId);
    if (user) {
      // You could create a LearningSession model to track interactions
      console.log(`AI Question from ${user.email}: ${question}`);
    }

    res.json({
      question,
      answer: aiResponse.data.answer,
      confidence: aiResponse.data.confidence,
      user_id: userId,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('AI question error:', error);
    res.status(500).json({ 
      message: 'Failed to process AI question',
      error: error.response?.data?.message || error.message
    });
  }
});

// Get user's AI learning history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // In a real implementation, you'd query a LearningSession model
    // For now, return a placeholder response
    res.json({
      user_id: userId,
      learning_sessions: [],
      total_questions: 0,
      message: 'Learning history tracking will be implemented with database integration'
    });
  } catch (error) {
    console.error('AI history error:', error);
    res.status(500).json({ message: 'Failed to get learning history' });
  }
});

// Get AI service information
router.get('/info', auth, async (req, res) => {
  try {
    const healthResponse = await axios.get(`${AI_SERVICE_URL}/health`);
    const pdfInfoResponse = await axios.get(`${AI_SERVICE_URL}/get_pdf_info`);
    
    res.json({
      ai_service: {
        status: healthResponse.data,
        current_pdf: pdfInfoResponse.data,
        service_url: AI_SERVICE_URL
      },
      integration: {
        backend_api: 'http://localhost:5000/api',
        ai_learning_ui: AI_SERVICE_URL,
        status: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      message: 'AI service information unavailable',
      error: error.message
    });
  }
});

// Clear AI learning session
router.post('/clear', [auth, checkAIService], async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/clear_pdf`);
    
    res.json({
      message: 'AI learning session cleared',
      result: response.data
    });
  } catch (error) {
    console.error('AI clear error:', error);
    res.status(500).json({ message: 'Failed to clear AI session' });
  }
});

// --- Conversational AI Routes ---

// Start a new conversation session
router.post('/conversation/start', [auth, checkAIService], async (req, res) => {
  try {
    const userId = req.user.id;
    
    const response = await axios.post(`${AI_SERVICE_URL}/start_conversation`, {
      user_id: userId
    });
    
    res.json({
      message: 'Conversation started successfully',
      session_id: response.data.session_id,
      greeting: response.data.greeting,
      personality: response.data.personality,
      status: response.data.status
    });
  } catch (error) {
    console.error('Conversation start error:', error);
    res.status(500).json({ 
      message: 'Failed to start conversation',
      error: error.message
    });
  }
});

// Get conversation history
router.get('/conversation/:sessionId/history', [auth, checkAIService], async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const response = await axios.get(`${AI_SERVICE_URL}/get_conversation_history/${sessionId}`);
    
    res.json({
      message: 'Conversation history retrieved',
      session_id: response.data.session_id,
      conversation_history: response.data.conversation_history,
      conversation_length: response.data.conversation_length
    });
  } catch (error) {
    console.error('Conversation history error:', error);
    res.status(500).json({ 
      message: 'Failed to get conversation history',
      error: error.message
    });
  }
});

// Clear conversation history
router.post('/conversation/:sessionId/clear', [auth, checkAIService], async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const response = await axios.post(`${AI_SERVICE_URL}/clear_conversation/${sessionId}`);
    
    res.json({
      message: 'Conversation cleared successfully',
      session_id: response.data.session_id,
      status: response.data.status,
      new_message: response.data.message
    });
  } catch (error) {
    console.error('Conversation clear error:', error);
    res.status(500).json({ 
      message: 'Failed to clear conversation',
      error: error.message
    });
  }
});

// Enhanced conversational ask endpoint
router.post('/ask/conversational', [auth, checkAIService], async (req, res) => {
  try {
    const { question, session_id } = req.body;
    const userId = req.user.id;

    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/ask_ai`, {
      question,
      user_id: userId,
      session_id: session_id || `${userId}_${Date.now()}`
    });

    // Track user learning activity
    try {
      const user = await User.findById(userId);
      if (user) {
        user.lastAIInteraction = new Date();
        await user.save();
      }
    } catch (userError) {
      console.log('User tracking error:', userError);
    }

    res.json({
      message: 'AI response generated successfully',
      answer: response.data.answer,
      confidence: response.data.confidence,
      ai_service: response.data.ai_service,
      response_type: response.data.response_type,
      conversation_length: response.data.conversation_length,
      pdf_metadata: response.data.pdf_metadata,
      available_services: response.data.available_services,
      session_id: session_id
    });
  } catch (error) {
    console.error('Conversational AI error:', error);
    res.status(500).json({ 
      message: 'Failed to generate AI response',
      error: error.message
    });
  }
});

module.exports = router;
