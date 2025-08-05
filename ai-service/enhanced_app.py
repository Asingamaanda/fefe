import fitz  # PyMuPDF for PDF text extraction
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from transformers import pipeline  # For basic, local QA
import os
import requests
import json
from datetime import datetime
import google.generativeai as genai
from openai import OpenAI
from dotenv import load_dotenv
import random
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for integration with Node.js backend

# --- Enhanced AI Configuration ---
# Multiple AI providers for different capabilities

# 1. Local DistilBERT (fast, offline, basic QA)
try:
    qa_pipeline = pipeline("question-answering", model="distilbert-base-cased-distilled-squad")
    print("✅ Local QA model (DistilBERT) loaded successfully")
except Exception as e:
    print(f"⚠️ Warning: Could not load local QA model. Error: {e}")
    qa_pipeline = None

# 2. Google Gemini (advanced reasoning, large context)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash')  # Updated model name
        print("✅ Google Gemini AI connected successfully")
    except Exception as e:
        print(f"⚠️ Gemini setup failed: {e}")
        gemini_model = None
else:
    print("⚠️ GEMINI_API_KEY not found in environment variables")
    gemini_model = None

# 3. OpenAI GPT (creative content, advanced reasoning)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI GPT connected successfully")
    except Exception as e:
        print(f"⚠️ OpenAI setup failed: {e}")
        openai_client = None
else:
    print("⚠️ OPENAI_API_KEY not found in environment variables")
    openai_client = None

# Configuration
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
BACKEND_API_URL = "http://localhost:5000/api"

# Global variables for document context
uploaded_pdf_text = ""
current_document_context = []
current_pdf_metadata = {}

# --- Conversational AI Personality System ---
# Conversation memory and personality traits for human-like interactions
conversation_memory = {}  # Store conversation history by user session
personality_traits = {
    "friendly": True,
    "encouraging": True,
    "patient": True,
    "expert": True,
    "conversational": True
}

# Conversation starters and personality responses
conversation_starters = [
    "Hey there! What would you like to learn about today?",
    "Hi! I'm here to help you understand any topic. What's on your mind?",
    "Hello! Ready to dive into some learning? What can I explain for you?",
    "Hey! What subject or question can I help you with today?",
    "Hi there! I'm excited to help you learn. What would you like to explore?"
]

encouraging_phrases = [
    "Great question!",
    "That's a really thoughtful question!",
    "I love that you're curious about this!",
    "Excellent point!",
    "That's exactly the right thing to ask!",
    "You're really thinking deeply about this!"
]

transition_phrases = [
    "Let me break this down for you...",
    "Here's how I like to think about it...",
    "Let me explain this in a way that makes sense...",
    "Here's what's really interesting about this...",
    "Let me walk you through this step by step...",
    "The way I see it is..."
]

empathy_responses = [
    "I can see why that might be confusing...",
    "That's a common thing people wonder about...",
    "Don't worry, this trips up a lot of people...",
    "I understand why this seems complicated...",
    "You're not alone in finding this challenging..."
]

def get_conversation_history(session_id):
    """Get conversation history for a user session"""
    return conversation_memory.get(session_id, [])

def add_to_conversation(session_id, user_message, ai_response):
    """Add exchange to conversation memory"""
    if session_id not in conversation_memory:
        conversation_memory[session_id] = []
    
    conversation_memory[session_id].append({
        "timestamp": datetime.now().isoformat(),
        "user": user_message,
        "ai": ai_response
    })
    
    # Keep only last 10 exchanges to manage memory
    if len(conversation_memory[session_id]) > 10:
        conversation_memory[session_id] = conversation_memory[session_id][-10:]

def add_personality_to_response(response, question_type="general"):
    """Add conversational personality to AI responses with proper formatting"""
    
    # First, clean and format the response structure
    response = format_response_structure(response)
    
    # Add encouraging opener
    if random.choice([True, False]):
        encouragement = random.choice(encouraging_phrases)
        response = f"{encouragement}\n\n{response}"
    
    # Add conversational transitions
    if len(response) > 100 and "explain" in response.lower():
        transition = random.choice(transition_phrases)
        response = response.replace("Let me explain", transition, 1)
    
    # Add empathy for complex topics
    complexity_words = ["difficult", "complex", "advanced", "challenging", "confusing"]
    if any(word in response.lower() for word in complexity_words):
        empathy = random.choice(empathy_responses)
        response = f"{empathy}\n\n{response}"
    
    # Make it more conversational with proper formatting
    response = make_conversational(response)
    
    # Final formatting pass
    response = final_formatting_pass(response)
    
    return response

def final_formatting_pass(text):
    """Final pass to ensure perfect formatting"""
    
    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Ensure proper paragraph spacing
    paragraphs = text.split('\n\n')
    formatted_paragraphs = []
    
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if paragraph:
            # Ensure each paragraph ends properly
            if not paragraph.endswith(('.', '!', '?', ':')):
                paragraph += '.'
            formatted_paragraphs.append(paragraph)
    
    # Join with consistent spacing
    result = '\n\n'.join(formatted_paragraphs)
    
    # Final cleanup
    result = result.strip()
    
    return result

def make_conversational(text):
    """Make text more conversational and human-like with proper formatting"""
    # Replace formal phrases with conversational ones
    conversational_replacements = {
        "In conclusion": "So basically",
        "Furthermore": "Also",
        "Therefore": "So",
        "Additionally": "Plus",
        "In summary": "To sum it up",
        "It is important to note": "What's really important here is",
        "One should": "You should",
        "It is recommended": "I'd recommend",
        "According to": "From what I understand",
        "In order to": "To"
    }
    
    for formal, casual in conversational_replacements.items():
        text = text.replace(formal, casual)
    
    # Format the text with proper structure
    text = format_response_structure(text)
    
    # Add conversational connectors
    if ". " in text:
        sentences = text.split(". ")
        if len(sentences) > 2:
            # Add conversational connectors randomly
            connectors = ["By the way", "Also", "And here's the thing", "Plus", "What's interesting is"]
            if random.choice([True, False]) and len(sentences) > 1:
                connector = random.choice(connectors)
                sentences[1] = f"{connector}, {sentences[1].lower()}"
            text = ". ".join(sentences)
    
    return text

def format_response_structure(text):
    """Format AI responses with proper alignment, spacing, and structure"""
    
    # Clean up the text first
    text = text.strip()
    
    # Fix punctuation issues
    text = fix_punctuation(text)
    
    # Split into logical sections
    sections = split_into_sections(text)
    
    # Format each section properly
    formatted_sections = []
    for section in sections:
        formatted_section = format_section(section)
        if formatted_section:
            formatted_sections.append(formatted_section)
    
    # Join sections with proper spacing
    return "\n\n".join(formatted_sections)

def fix_punctuation(text):
    """Fix common punctuation and spacing issues"""
    
    # Fix multiple spaces
    text = re.sub(r'\s+', ' ', text)
    
    # Fix missing spaces after punctuation
    text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
    
    # Fix missing periods at end of sentences
    if text and not text.endswith(('.', '!', '?')):
        text += '.'
    
    # Fix spacing around commas
    text = re.sub(r'\s*,\s*', ', ', text)
    
    # Fix spacing around colons
    text = re.sub(r'\s*:\s*', ': ', text)
    
    # Fix quotes spacing
    text = re.sub(r'\s*"\s*', '"', text)
    text = re.sub(r'"\s+', '" ', text)
    text = re.sub(r'\s+"', ' "', text)
    
    return text

def split_into_sections(text):
    """Split text into logical sections for better formatting"""
    
    # Common section indicators
    section_indicators = [
        r'\d+\.', # Numbered lists
        r'[A-Z][a-z]*:', # Topic headers like "Definition:", "Example:"
        r'Here\'s', r'Let me', r'Now,', r'First,', r'Second,', r'Finally,',
        r'For example', r'To understand', r'Think of it'
    ]
    
    sections = []
    current_section = ""
    
    sentences = text.split('. ')
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Check if this starts a new section
        is_new_section = False
        for indicator in section_indicators:
            if re.match(indicator, sentence, re.IGNORECASE):
                is_new_section = True
                break
        
        if is_new_section and current_section:
            sections.append(current_section.strip())
            current_section = sentence
        else:
            if current_section:
                current_section += ". " + sentence
            else:
                current_section = sentence
    
    if current_section:
        sections.append(current_section.strip())
    
    return sections

def format_section(section):
    """Format individual sections with proper structure"""
    
    if not section:
        return ""
    
    # Ensure proper sentence ending
    if not section.endswith(('.', '!', '?')):
        section += '.'
    
    # Handle lists and numbered items
    if re.match(r'\d+\.', section):
        return format_numbered_item(section)
    
    # Handle definition-style sections
    if ':' in section and len(section.split(':')) == 2:
        return format_definition_section(section)
    
    # Handle example sections
    if section.lower().startswith(('for example', 'think of it', 'imagine')):
        return format_example_section(section)
    
    # Regular paragraph formatting
    return format_paragraph(section)

def format_numbered_item(section):
    """Format numbered list items"""
    return f"   {section}"

def format_definition_section(section):
    """Format definition-style sections"""
    parts = section.split(':', 1)
    if len(parts) == 2:
        topic = parts[0].strip()
        explanation = parts[1].strip()
        return f"**{topic}:** {explanation}"
    return section

def format_example_section(section):
    """Format example sections"""
    return f"💡 {section}"

def format_paragraph(section):
    """Format regular paragraphs with proper line breaks"""
    
    # If it's a long paragraph, add logical breaks
    if len(section) > 200:
        sentences = section.split('. ')
        if len(sentences) > 2:
            # Group sentences into smaller chunks
            chunks = []
            current_chunk = []
            current_length = 0
            
            for sentence in sentences:
                sentence_length = len(sentence)
                if current_length + sentence_length > 150 and current_chunk:
                    chunks.append('. '.join(current_chunk) + '.')
                    current_chunk = [sentence]
                    current_length = sentence_length
                else:
                    current_chunk.append(sentence)
                    current_length += sentence_length
            
            if current_chunk:
                chunks.append('. '.join(current_chunk) + '.')
            
            return '\n'.join(chunks)
    
    return section

def create_contextual_prompt(question, conversation_history, document_context=""):
    """Create a context-aware prompt that feels conversational with proper formatting"""
    
    # Build context from conversation history
    history_context = ""
    if conversation_history:
        recent_topics = []
        for exchange in conversation_history[-3:]:  # Last 3 exchanges
            recent_topics.append(exchange["user"])
        
        if recent_topics:
            history_context = f"We've been talking about: {', '.join(recent_topics)}. "
    
    # Create personality-driven prompt with formatting instructions
    prompt = f"""You are a friendly, encouraging, and knowledgeable tutor who loves helping people learn. 
You have a warm, conversational personality and explain things in a way that feels like talking to a smart friend.

{history_context}

Current question: {question}

{f"Document context: {document_context}" if document_context else ""}

RESPONSE FORMATTING REQUIREMENTS:
- Use proper paragraphs with clear spacing
- Write in complete, well-punctuated sentences
- Break complex ideas into digestible paragraphs
- Use proper grammar and punctuation throughout
- Organize your response with logical flow
- Use line breaks to separate different concepts
- Make each paragraph focus on one main idea

PERSONALITY INSTRUCTIONS:
- Be conversational and warm, like talking to a friend
- Use "you" and "I" naturally
- Share enthusiasm for the topic
- Break down complex ideas into digestible pieces
- Use examples and analogies that relate to everyday life
- Be encouraging and patient
- If building on previous conversation, acknowledge the connection
- Keep it engaging and avoid being too formal or robotic

STRUCTURE YOUR RESPONSE:
1. Start with an engaging opener
2. Present main concepts in clear paragraphs
3. Use examples when helpful
4. End with encouragement or next steps

Response:"""
    
    return prompt

def get_available_ai_services():
    """Check which AI services are available"""
    services = {
        'local_qa': qa_pipeline is not None,
        'gemini': gemini_model is not None,
        'openai': openai_client is not None
    }
    return services

def smart_ai_router(question, context, complexity="medium"):
    """Route questions to the best available AI service based on complexity"""
    services = get_available_ai_services()
    
    # Determine question complexity
    complex_keywords = ['explain', 'analyze', 'create', 'generate', 'design', 'plan', 'develop', 'synthesize']
    creative_keywords = ['write', 'create', 'story', 'example', 'scenario', 'imagine']
    educational_keywords = ['teach', 'learn', 'study', 'curriculum', 'lesson', 'assessment']
    
    is_complex = any(keyword in question.lower() for keyword in complex_keywords)
    is_creative = any(keyword in question.lower() for keyword in creative_keywords)
    is_educational = any(keyword in question.lower() for keyword in educational_keywords)
    
    # Smart routing logic
    if is_educational and services['gemini']:
        return "gemini"  # Best for educational content
    elif is_creative and services['openai']:
        return "openai"  # Best for creative tasks
    elif is_complex and (services['gemini'] or services['openai']):
        return "gemini" if services['gemini'] else "openai"
    elif services['local_qa']:
        return "local"  # Fast local processing
    else:
        return "fallback"

def ask_gemini(question, context, pdf_metadata):
    """Enhanced educational responses using Google Gemini"""
    try:
        # Create comprehensive educational prompt
        educational_prompt = f"""
You are an expert CAPS curriculum educator and AI tutor. A student has uploaded a curriculum document and is asking a question about it.

DOCUMENT CONTEXT:
{context[:8000]}  # Large context window for Gemini

CURRICULUM METADATA:
- Grades: {pdf_metadata.get('curriculum_structure', {}).get('grades', [])}
- Subject Areas: {pdf_metadata.get('curriculum_structure', {}).get('subject_areas', [])}
- Learning Outcomes: {pdf_metadata.get('curriculum_structure', {}).get('learning_outcomes', [])}
- Key Concepts: {pdf_metadata.get('curriculum_structure', {}).get('concepts', [])}

STUDENT QUESTION: {question}

Please provide a comprehensive educational response that includes:

1. 🎯 **DIRECT ANSWER** to the student's question
2. 📚 **CURRICULUM CONTEXT** - how this relates to CAPS standards
3. 📖 **LEARNING BREAKDOWN** - key concepts students should master
4. 🔄 **LEARNING SEQUENCE** - step-by-step learning path
5. 📊 **ASSESSMENT FOCUS** - what will be evaluated
6. 💡 **STUDY TIPS** - practical advice for mastering this topic
7. 🎲 **PRACTICE SUGGESTIONS** - activities to reinforce learning

Format your response with clear sections using emojis and bullet points for easy reading.
Be specific, practical, and educational. Aim for a response that truly helps the student learn.
"""

        response = gemini_model.generate_content(educational_prompt)
        
        return {
            "answer": response.text,
            "confidence": 0.95,  # High confidence for Gemini
            "ai_service": "Google Gemini",
            "response_type": "comprehensive_educational"
        }
        
    except Exception as e:
        print(f"Gemini error: {e}")
        return None

def ask_openai(question, context, pdf_metadata):
    """Creative and interactive educational content using OpenAI"""
    try:
        # Create creative educational prompt
        educational_prompt = f"""
You are a creative and engaging CAPS curriculum tutor. Help this student with their question by providing an interactive, creative response.

CURRICULUM CONTENT:
{context[:6000]}

CURRICULUM INFO:
- Target Grades: {pdf_metadata.get('curriculum_structure', {}).get('grades', [])}
- Subjects: {pdf_metadata.get('curriculum_structure', {}).get('subject_areas', [])}

STUDENT QUESTION: {question}

Provide a creative, engaging educational response that includes:

🎯 **Clear Answer** to their question
📚 **Real-World Examples** that make concepts relatable  
🎮 **Interactive Elements** (questions for self-reflection)
🔍 **Step-by-Step Breakdown** of complex concepts
💡 **Memory Techniques** or mnemonics if applicable
🎨 **Visual Learning Suggestions** (diagrams, charts, etc.)
🏆 **Practice Challenges** they can try
🤔 **Reflection Questions** to deepen understanding

Make it engaging, practical, and memorable. Use analogies, examples, and interactive elements to help the student truly understand and retain the information.
"""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",  # or "gpt-4" if available
            messages=[
                {"role": "system", "content": "You are an expert educational AI tutor specializing in CAPS curriculum."},
                {"role": "user", "content": educational_prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        return {
            "answer": response.choices[0].message.content,
            "confidence": 0.90,
            "ai_service": "OpenAI GPT",
            "response_type": "creative_interactive"
        }
        
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None

def ask_local_qa(question, context):
    """Basic QA using local DistilBERT model"""
    if not qa_pipeline:
        return None
    
    try:
        # Use existing local QA logic
        best_answer = None
        max_score = -1
        
        for chunk in current_document_context:
            truncated_chunk = chunk[:1000]
            result = qa_pipeline(question=question, context=truncated_chunk)
            
            if result and result['score'] > max_score and result['score'] > 0.3:
                best_answer = result['answer']
                max_score = result['score']
        
        if best_answer:
            return {
                "answer": best_answer,
                "confidence": max_score,
                "ai_service": "Local DistilBERT",
                "response_type": "basic_qa"
            }
    except Exception as e:
        print(f"Local QA error: {e}")
    
    return None

# --- Conversational AI Functions ---
def ask_gemini_conversational(question, contextual_prompt, pdf_metadata):
    """Conversational educational responses using Google Gemini"""
    try:
        response = gemini_model.generate_content(contextual_prompt)
        
        # Add personality to the response
        enhanced_response = add_personality_to_response(response.text, "educational")
        
        return {
            "answer": enhanced_response,
            "confidence": 0.95,
            "ai_service": "Google Gemini (Conversational)",
            "response_type": "conversational_educational"
        }
        
    except Exception as e:
        print(f"Gemini conversational error: {e}")
        return None

def ask_openai_conversational(question, contextual_prompt, pdf_metadata):
    """Conversational and creative educational content using OpenAI"""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a friendly, encouraging AI tutor who makes learning fun and conversational."},
                {"role": "user", "content": contextual_prompt}
            ],
            max_tokens=800,
            temperature=0.7
        )
        
        enhanced_response = add_personality_to_response(response.choices[0].message.content, "creative")
        
        return {
            "answer": enhanced_response,
            "confidence": 0.90,
            "ai_service": "OpenAI GPT (Conversational)",
            "response_type": "conversational_creative"
        }
        
    except Exception as e:
        print(f"OpenAI conversational error: {e}")
        return None

# --- Conversation Management Endpoints ---
@app.route('/start_conversation', methods=['POST'])
def start_conversation():
    """Start a new conversation session"""
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    session_id = f"{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    greeting = random.choice(conversation_starters)
    
    # Initialize conversation
    add_to_conversation(session_id, "Session started", greeting)
    
    return jsonify({
        "session_id": session_id,
        "greeting": greeting,
        "personality": personality_traits,
        "status": "conversation_started"
    })

@app.route('/get_conversation_history/<session_id>')
def get_conversation_history_endpoint(session_id):
    """Get conversation history for a session"""
    history = get_conversation_history(session_id)
    
    return jsonify({
        "session_id": session_id,
        "conversation_history": history,
        "conversation_length": len(history)
    })

@app.route('/clear_conversation/<session_id>', methods=['POST'])
def clear_conversation(session_id):
    """Clear conversation history for a session"""
    if session_id in conversation_memory:
        del conversation_memory[session_id]
    
    return jsonify({
        "session_id": session_id,
        "status": "conversation_cleared",
        "message": "Ready for a fresh start! What would you like to learn about?"
    })

# [Previous functions remain the same: extract_text_from_pdf, chunk_text, analyze_caps_structure, synthesize_learning_breakdown]

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF document."""
    text = ""
    metadata = {}
    try:
        document = fitz.open(pdf_path)
        metadata['total_pages'] = len(document)
        metadata['title'] = document.metadata.get('title', 'Unknown')
        metadata['author'] = document.metadata.get('author', 'Unknown')
        
        for page_num in range(len(document)):
            page = document.load_page(page_num)
            text += f"\n--- Page {page_num + 1} ---\n"
            text += page.get_text()
        
        metadata['word_count'] = len(text.split())
        return text, metadata
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None, None

def chunk_text(text, max_chunk_size=500):
    """Splits text into smaller, manageable chunks."""
    words = text.split()
    chunks = []
    current_chunk = []
    for word in words:
        current_chunk.append(word)
        if len(" ".join(current_chunk)) > max_chunk_size:
            chunks.append(" ".join(current_chunk[:-1]))
            current_chunk = [word]
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

def analyze_caps_structure(text):
    """Analyze CAPS curriculum structure and extract key concepts."""
    import re
    
    patterns = {
        'grade_levels': r'Grade\s+(\d+)',
        'learning_outcomes': r'Learning\s+Outcome[s]?\s*:?\s*([^\n]+)',
        'assessment_standards': r'Assessment\s+Standard[s]?\s*:?\s*([^\n]+)',
        'content_areas': r'Content\s+Area[s]?\s*:?\s*([^\n]+)',
        'topics': r'Topic[s]?\s*:?\s*([^\n]+)',
        'skills': r'Skill[s]?\s*:?\s*([^\n]+)',
        'concepts': r'Concept[s]?\s*:?\s*([^\n]+)',
        'knowledge': r'Knowledge\s*:?\s*([^\n]+)',
        'term_work': r'Term\s+(\d+)\s*:?\s*([^\n]+)',
        'weekly_breakdown': r'Week\s+(\d+)\s*:?\s*([^\n]+)',
        'objectives': r'(?:Learning\s+)?Objective[s]?\s*:?\s*([^\n]+)',
        'activities': r'Activit(?:y|ies)\s*:?\s*([^\n]+)',
        'resources': r'Resource[s]?\s*:?\s*([^\n]+)',
        'time_allocation': r'Time\s*:?\s*(\d+)\s*(?:hours?|minutes?|periods?)',
        'mathematical_concepts': r'(?:sin|cos|tan|algebra|geometry|calculus|trigonometry|logarithm|equation|formula|theorem)',
        'subject_areas': r'(?:Mathematics|Science|English|History|Geography|Life Sciences|Physical Sciences|Technology)',
    }
    
    curriculum_structure = {
        'grades': set(),
        'learning_outcomes': [],
        'assessment_standards': [],
        'content_areas': [],
        'topics': [],
        'skills': [],
        'concepts': [],
        'knowledge_areas': [],
        'term_breakdown': {},
        'weekly_breakdown': {},
        'objectives': [],
        'activities': [],
        'resources': [],
        'time_allocations': [],
        'mathematical_concepts': set(),
        'subject_areas': set(),
        'sections': []
    }
    
    # Extract structured information
    for category, pattern in patterns.items():
        if category == 'grade_levels':
            matches = re.findall(pattern, text, re.IGNORECASE)
            curriculum_structure['grades'].update(matches)
        elif category == 'term_work':
            matches = re.findall(pattern, text, re.IGNORECASE)
            for term, content in matches:
                curriculum_structure['term_breakdown'][f'Term {term}'] = content.strip()
        elif category == 'weekly_breakdown':
            matches = re.findall(pattern, text, re.IGNORECASE)
            for week, content in matches:
                curriculum_structure['weekly_breakdown'][f'Week {week}'] = content.strip()
        elif category == 'time_allocation':
            matches = re.findall(pattern, text, re.IGNORECASE)
            curriculum_structure['time_allocations'].extend(matches)
        elif category in ['mathematical_concepts', 'subject_areas']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            curriculum_structure[category].update([m.lower() for m in matches])
        else:
            matches = re.findall(pattern, text, re.IGNORECASE)
            key = category.replace('_', '_')
            if key in curriculum_structure:
                curriculum_structure[key].extend([m.strip() for m in matches if m.strip()])
    
    # Extract sections by looking for numbered sections or headings
    section_pattern = r'(?:^|\n)\s*(?:\d+\.?\s*)?([A-Z][^.\n]*(?:Identity|Formula|Concept|Topic|Skill|Knowledge|Learning|Assessment)[^.\n]*)'
    sections = re.findall(section_pattern, text, re.MULTILINE | re.IGNORECASE)
    curriculum_structure['sections'] = [s.strip() for s in sections if len(s.strip()) > 5]
    
    # Convert sets to lists for JSON serialization
    curriculum_structure['grades'] = list(curriculum_structure['grades'])
    curriculum_structure['mathematical_concepts'] = list(curriculum_structure['mathematical_concepts'])
    curriculum_structure['subject_areas'] = list(curriculum_structure['subject_areas'])
    
    return curriculum_structure

def synthesize_learning_breakdown(curriculum_structure, user_question):
    """Create a structured learning breakdown based on curriculum analysis."""
    
    breakdown = {
        "curriculum_overview": {},
        "learning_path": [],
        "key_concepts": [],
        "assessment_criteria": [],
        "recommended_sequence": [],
        "time_allocation": {},
        "resources_needed": []
    }
    
    # Overview
    if curriculum_structure['grades']:
        breakdown["curriculum_overview"]["target_grades"] = curriculum_structure['grades']
    if curriculum_structure['subject_areas']:
        breakdown["curriculum_overview"]["subject_areas"] = curriculum_structure['subject_areas']
    
    # Key concepts extraction
    all_concepts = (curriculum_structure['concepts'] + 
                   curriculum_structure['topics'] + 
                   curriculum_structure['sections'])
    breakdown["key_concepts"] = list(set(all_concepts))[:10]
    
    # Learning path
    if curriculum_structure['learning_outcomes']:
        breakdown["learning_path"] = curriculum_structure['learning_outcomes'][:5]
    
    # Assessment
    if curriculum_structure['assessment_standards']:
        breakdown["assessment_criteria"] = curriculum_structure['assessment_standards'][:5]
    
    # Sequence from term/weekly breakdown
    if curriculum_structure['term_breakdown']:
        breakdown["recommended_sequence"] = [
            f"{term}: {content}" for term, content in curriculum_structure['term_breakdown'].items()
        ]
    elif curriculum_structure['weekly_breakdown']:
        breakdown["recommended_sequence"] = [
            f"{week}: {content}" for week, content in curriculum_structure['weekly_breakdown'].items()
        ][:8]
    
    # Time allocation
    if curriculum_structure['time_allocations']:
        breakdown["time_allocation"]["estimated_duration"] = curriculum_structure['time_allocations']
    
    # Resources
    if curriculum_structure['resources']:
        breakdown["resources_needed"] = curriculum_structure['resources'][:5]
    
    return breakdown

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint with AI service status"""
    services = get_available_ai_services()
    return jsonify({
        "status": "healthy",
        "ai_services": services,
        "total_services": sum(services.values()),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/upload_pdf', methods=['POST'])
def upload_pdf():
    global uploaded_pdf_text, current_document_context, current_pdf_metadata
    
    if 'pdf_file' not in request.files:
        return jsonify({"success": False, "message": "No PDF file part"})
    
    file = request.files['pdf_file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"})
    
    if file and file.filename.endswith('.pdf'):
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)
        
        extracted_text, metadata = extract_text_from_pdf(filepath)
        if extracted_text:
            uploaded_pdf_text = extracted_text
            current_document_context = chunk_text(uploaded_pdf_text)
            current_pdf_metadata = metadata
            
            # Analyze CAPS curriculum structure
            curriculum_analysis = analyze_caps_structure(uploaded_pdf_text)
            current_pdf_metadata['curriculum_structure'] = curriculum_analysis
            
            return jsonify({
                "success": True, 
                "message": "PDF uploaded and processed successfully!",
                "metadata": {
                    "filename": file.filename,
                    "pages": metadata.get('total_pages', 0),
                    "word_count": metadata.get('word_count', 0),
                    "chunks": len(current_document_context)
                },
                "curriculum_analysis": {
                    "grades_covered": curriculum_analysis.get('grades', []),
                    "key_concepts": curriculum_analysis.get('concepts', [])[:5],
                    "learning_outcomes": curriculum_analysis.get('learning_outcomes', [])[:3],
                    "subject_areas": curriculum_analysis.get('subject_areas', []),
                    "sections_found": len(curriculum_analysis.get('sections', []))
                },
                "ai_services_available": get_available_ai_services()
            })
        else:
            return jsonify({"success": False, "message": "Failed to extract text from PDF."})
    
    return jsonify({"success": False, "message": "Invalid file type. Please upload a PDF."})

@app.route('/ask_ai', methods=['POST'])
def ask_ai():
    global uploaded_pdf_text, current_pdf_metadata
    
    data = request.json
    user_question = data.get('question')
    user_id = data.get('user_id', 'anonymous')
    session_id = data.get('session_id', user_id)  # Use session ID for conversation memory
    
    if not user_question:
        greeting = random.choice(conversation_starters)
        return jsonify({
            "answer": greeting,
            "confidence": 1.0,
            "ai_service": "Conversational",
            "response_type": "greeting"
        })

    # Get conversation history for context
    conversation_history = get_conversation_history(session_id)
    
    # Handle general conversation without PDF requirement for better UX
    if not uploaded_pdf_text and any(word in user_question.lower() for word in ["hello", "hi", "hey", "what", "how", "help", "explain"]):
        # Allow general conversation even without PDF
        contextual_prompt = create_contextual_prompt(user_question, conversation_history)
        
        # Try to get a conversational response
        ai_response = None
        if gemini_model:
            try:
                response = gemini_model.generate_content(contextual_prompt)
                ai_response = {
                    "answer": add_personality_to_response(response.text),
                    "confidence": 0.9,
                    "ai_service": "Gemini (Conversational)",
                    "response_type": "general_conversation"
                }
            except Exception as e:
                print(f"Gemini error: {e}")
        
        # Fallback for general conversation
        if not ai_response:
            encouraging_response = f"{random.choice(encouraging_phrases)} I'd love to help you learn! While I work best with curriculum documents, I can still try to explain things. What would you like to understand better?"
            ai_response = {
                "answer": encouraging_response,
                "confidence": 0.7,
                "ai_service": "Conversational Assistant",
                "response_type": "encouraging"
            }
    
    elif not uploaded_pdf_text:
        return jsonify({
            "answer": "Hey! I'd love to help you learn. I work best when you upload a curriculum PDF, but I can still try to answer general questions. What would you like to know?",
            "requires_pdf": True,
            "confidence": 0.8,
            "ai_service": "Conversational",
            "response_type": "helpful_suggestion"
        })
    
    else:
        # Full conversational AI with document context
        document_context = " ".join(current_document_context[:5])
        contextual_prompt = create_contextual_prompt(user_question, conversation_history, document_context)
        
        # Smart AI routing with conversational enhancement
        ai_service = smart_ai_router(user_question, uploaded_pdf_text)
        ai_response = None
        
        # Try advanced AI services with conversational prompts
        if ai_service == "gemini":
            ai_response = ask_gemini_conversational(user_question, contextual_prompt, current_pdf_metadata)
        elif ai_service == "openai":
            ai_response = ask_openai_conversational(user_question, contextual_prompt, current_pdf_metadata)
        
        # Fallback to local QA with personality enhancement
        if not ai_response:
            basic_response = ask_local_qa(user_question, document_context)
            if basic_response and basic_response.get("answer"):
                enhanced_answer = add_personality_to_response(basic_response["answer"])
                ai_response = {
                    "answer": enhanced_answer,
                    "confidence": basic_response.get("confidence", 0.6),
                    "ai_service": "Local QA (Enhanced)",
                    "response_type": "enhanced_local"
                }
    
    # Final fallback with personality
    if not ai_response:
        curriculum_structure = current_pdf_metadata.get('curriculum_structure', {})
        context_info = f"this document covers grades {', '.join(curriculum_structure.get('grades', []))}"
        
        fallback_response = f"You know what, that's a great question! While I'm still figuring out the best way to answer it from {context_info}, I'd love to help. Could you try asking about specific learning objectives, concepts, or assessment criteria? I'm here to make learning easier for you!"
        
        ai_response = {
            "answer": fallback_response,
            "confidence": 0.5,
            "ai_service": "Conversational Fallback",
            "response_type": "encouraging_fallback"
        }

    # Add to conversation memory
    add_to_conversation(session_id, user_question, ai_response["answer"])

    # Save learning session with conversational context
    try:
        session_data = {
            "user_id": user_id,
            "session_id": session_id,
            "question": user_question,
            "answer": ai_response["answer"],
            "ai_service": ai_response.get("ai_service", "unknown"),
            "confidence": ai_response.get("confidence", 0),
            "pdf_title": current_pdf_metadata.get('title', 'No PDF uploaded'),
            "conversation_length": len(conversation_history),
            "response_type": ai_response.get("response_type", "standard"),
            "timestamp": datetime.now().isoformat()
        }
        print(f"�️ Conversational Learning Session: {session_data}")
    except Exception as e:
        print(f"Error saving conversational session: {e}")

    return jsonify({
        "answer": ai_response["answer"],
        "confidence": ai_response.get("confidence", 0),
        "ai_service": ai_response.get("ai_service", "unknown"),
        "response_type": ai_response.get("response_type", "conversational"),
        "conversation_length": len(conversation_history),
        "pdf_metadata": current_pdf_metadata,
        "available_services": get_available_ai_services()
    })

@app.route('/get_curriculum_breakdown')
def get_curriculum_breakdown():
    """Get detailed curriculum breakdown and analysis"""
    if not uploaded_pdf_text:
        return jsonify({"error": "No PDF loaded"})
    
    curriculum_structure = current_pdf_metadata.get('curriculum_structure', {})
    if not curriculum_structure:
        return jsonify({"error": "No curriculum analysis available"})
    
    # Generate comprehensive breakdown
    breakdown = synthesize_learning_breakdown(curriculum_structure, "general overview")
    
    return jsonify({
        "curriculum_breakdown": breakdown,
        "detailed_analysis": {
            "total_concepts": len(curriculum_structure.get('concepts', [])),
            "learning_outcomes": curriculum_structure.get('learning_outcomes', []),
            "assessment_standards": curriculum_structure.get('assessment_standards', []),
            "content_areas": curriculum_structure.get('content_areas', []),
            "skills": curriculum_structure.get('skills', []),
            "knowledge_areas": curriculum_structure.get('knowledge_areas', []),
            "activities": curriculum_structure.get('activities', []),
            "resources": curriculum_structure.get('resources', []),
            "term_breakdown": curriculum_structure.get('term_breakdown', {}),
            "weekly_breakdown": curriculum_structure.get('weekly_breakdown', {}),
            "mathematical_concepts": curriculum_structure.get('mathematical_concepts', []),
            "sections": curriculum_structure.get('sections', [])
        },
        "summary": {
            "grades_covered": curriculum_structure.get('grades', []),
            "subject_areas": list(curriculum_structure.get('subject_areas', [])),
            "total_sections": len(curriculum_structure.get('sections', [])),
            "learning_outcomes_count": len(curriculum_structure.get('learning_outcomes', [])),
            "concepts_count": len(curriculum_structure.get('concepts', []))
        },
        "ai_services_used": get_available_ai_services()
    })

@app.route('/get_pdf_info')
def get_pdf_info():
    """Get information about the currently loaded PDF"""
    if not uploaded_pdf_text:
        return jsonify({"loaded": False})
    
    return jsonify({
        "loaded": True,
        "metadata": current_pdf_metadata,
        "chunks_count": len(current_document_context),
        "text_preview": uploaded_pdf_text[:200] + "..." if len(uploaded_pdf_text) > 200 else uploaded_pdf_text,
        "ai_services": get_available_ai_services()
    })

@app.route('/clear_pdf', methods=['POST'])
def clear_pdf():
    """Clear the currently loaded PDF"""
    global uploaded_pdf_text, current_document_context, current_pdf_metadata
    
    uploaded_pdf_text = ""
    current_document_context = []
    current_pdf_metadata = {}
    
    return jsonify({"success": True, "message": "PDF cleared successfully"})

@app.route('/api/integration/test')
def test_backend_integration():
    """Test integration with Node.js backend"""
    try:
        response = requests.get(f"{BACKEND_API_URL}/courses", timeout=5)
        return jsonify({
            "backend_connection": "success",
            "status_code": response.status_code,
            "message": "Successfully connected to fefe backend"
        })
    except Exception as e:
        return jsonify({
            "backend_connection": "failed",
            "error": str(e),
            "message": "Could not connect to fefe backend"
        })

if __name__ == '__main__':
    print("🚀 Starting Enhanced FEFE AI Learning Service...")
    print("📚 Multi-AI powered educational system")
    
    services = get_available_ai_services()
    print(f"🤖 Available AI Services:")
    print(f"   📱 Local DistilBERT: {'✅' if services['local_qa'] else '❌'}")
    print(f"   🧠 Google Gemini: {'✅' if services['gemini'] else '❌'}")
    print(f"   💭 OpenAI GPT: {'✅' if services['openai'] else '❌'}")
    
    if not any(services.values()):
        print("⚠️ WARNING: No AI services available! Please configure API keys.")
    
    print("🔗 Integrates with FEFE backend API")
    print("🌐 Running on http://localhost:5001")
    
    app.run(debug=True, port=5001, host='0.0.0.0')
