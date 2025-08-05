import fitz  # PyMuPDF for PDF text extraction
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from transformers import pipeline  # For a very basic, local language model demo
import os
import requests
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for integration with Node.js backend

# --- Configuration ---
# For a real system, you'd use a cloud-based LLM like Google's Gemini API
# and a robust embedding model.
# This is just for demonstration purposes with a small, local model.
try:
    qa_pipeline = pipeline("question-answering", model="distilbert-base-cased-distilled-squad")
    print("✅ QA model loaded successfully")
except Exception as e:
    print(f"⚠️ Warning: Could not load local QA model. This demo will have limited functionality. Error: {e}")
    qa_pipeline = None

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Backend API configuration
BACKEND_API_URL = "http://localhost:5000/api"

# In a real system, this would be a sophisticated vector database
# storing embeddings of PDF content for fast retrieval.
# For this demo, we'll just store the raw text for simplicity.
uploaded_pdf_text = ""
current_document_context = []  # Stores chunks of the PDF for the AI to refer to
current_pdf_metadata = {}

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
    
    # Define patterns for CAPS curriculum elements
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
    breakdown["key_concepts"] = list(set(all_concepts))[:10]  # Top 10 unique concepts
    
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
        ][:8]  # First 8 weeks
    
    # Time allocation
    if curriculum_structure['time_allocations']:
        breakdown["time_allocation"]["estimated_duration"] = curriculum_structure['time_allocations']
    
    # Resources
    if curriculum_structure['resources']:
        breakdown["resources_needed"] = curriculum_structure['resources'][:5]
    
    return breakdown

def save_learning_session(user_id, question, answer, pdf_title):
    """Save learning session to backend database via API"""
    try:
        session_data = {
            "user_id": user_id,
            "question": question,
            "answer": answer,
            "pdf_title": pdf_title,
            "timestamp": datetime.now().isoformat()
        }
        
        # This would integrate with your backend API
        # For now, we'll just log it
        print(f"📚 Learning Session: {session_data}")
        return True
    except Exception as e:
        print(f"Error saving learning session: {e}")
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "ai_model_loaded": qa_pipeline is not None,
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
                }
            })
        else:
            return jsonify({"success": False, "message": "Failed to extract text from PDF."})
    
    return jsonify({"success": False, "message": "Invalid file type. Please upload a PDF."})

@app.route('/ask_ai', methods=['POST'])
def ask_ai():
    global qa_pipeline, current_document_context, current_pdf_metadata
    
    data = request.json
    user_question = data.get('question')
    user_id = data.get('user_id', 'anonymous')
    
    if not user_question:
        return jsonify({"answer": "Please ask a question."})

    if not uploaded_pdf_text:
        return jsonify({
            "answer": "Please upload a CAPS curriculum PDF first to enable AI teaching.",
            "requires_pdf": True
        })

    ai_response = "I'm sorry, I couldn't find an answer in the provided document."
    confidence_score = 0

    if qa_pipeline:
        # Enhanced RAG with curriculum structure analysis
        best_answer = None
        max_score = -1
        best_chunk_index = -1
        
        # First, try to get structured breakdown if question is about learning/concepts
        learning_keywords = ['learn', 'study', 'concept', 'breakdown', 'explain', 'what is', 'how to', 'teach', 'understand']
        if any(keyword in user_question.lower() for keyword in learning_keywords):
            curriculum_structure = current_pdf_metadata.get('curriculum_structure', {})
            if curriculum_structure:
                learning_breakdown = synthesize_learning_breakdown(curriculum_structure, user_question)
                
                # Create a comprehensive response
                structured_response = f"""
📚 **CAPS Curriculum Breakdown for your question:**

🎯 **Key Concepts to Learn:**
{chr(10).join(['• ' + concept for concept in learning_breakdown['key_concepts'][:5]])}

📖 **Learning Path:**
{chr(10).join(['→ ' + outcome for outcome in learning_breakdown['learning_path'][:3]])}

⏰ **Recommended Sequence:**
{chr(10).join(['📅 ' + seq for seq in learning_breakdown['recommended_sequence'][:4]])}

📊 **Assessment Focus:**
{chr(10).join(['✓ ' + criteria for criteria in learning_breakdown['assessment_criteria'][:3]])}

🎓 **Target Grades:** {', '.join(learning_breakdown['curriculum_overview'].get('target_grades', ['Not specified']))}

📋 **Subject Areas:** {', '.join(learning_breakdown['curriculum_overview'].get('subject_areas', ['Not specified']))}
"""
                
                if structured_response.strip():
                    ai_response = structured_response
                    confidence_score = 0.85  # High confidence for structured analysis
        
        # If no structured response, fall back to traditional QA
        if ai_response == "I'm sorry, I couldn't find an answer in the provided document.":
            for i, chunk in enumerate(current_document_context):
                try:
                    # Limit the context size for the local model
                    truncated_chunk = chunk[:1000]  # Reasonable limit for context
                    result = qa_pipeline(question=user_question, context=truncated_chunk)
                    
                    if result and result['score'] > max_score and result['score'] > 0.3:  # Lower threshold
                        best_answer = result['answer']
                        max_score = result['score']
                        best_chunk_index = i
                except Exception as e:
                    print(f"Error during QA: {e}")
                    continue

            if best_answer:
                # Enhance the answer with context
                curriculum_structure = current_pdf_metadata.get('curriculum_structure', {})
                context_info = ""
                
                if curriculum_structure.get('grades'):
                    context_info += f"\n🎓 **Relevant Grades:** {', '.join(curriculum_structure['grades'])}"
                
                if curriculum_structure.get('subject_areas'):
                    context_info += f"\n📚 **Subject:** {', '.join(list(curriculum_structure['subject_areas']))}"
                
                # Find related concepts
                related_concepts = [concept for concept in curriculum_structure.get('concepts', [])
                                  if any(word in concept.lower() for word in user_question.lower().split())][:3]
                
                if related_concepts:
                    context_info += f"\n🔗 **Related Concepts:** {', '.join(related_concepts)}"
                
                ai_response = f"**Answer:** {best_answer}\n{context_info}"
                confidence_score = max_score
            else:
                # Enhanced fallback with curriculum context
                curriculum_structure = current_pdf_metadata.get('curriculum_structure', {})
                if current_document_context and curriculum_structure:
                    # Use the first chunk as general context
                    context_preview = current_document_context[0][:300] + "..."
                    
                    related_sections = [section for section in curriculum_structure.get('sections', [])
                                      if any(word in section.lower() for word in user_question.lower().split())][:2]
                    
                    ai_response = f"""I can help you with that! Based on the CAPS curriculum document, here's what I found:

📖 **Document Overview:** {context_preview}

🔍 **Related Sections:** {', '.join(related_sections) if related_sections else 'Please be more specific about the topic'}

💡 **Suggestion:** Try asking about specific topics like:
{chr(10).join(['• ' + concept for concept in curriculum_structure.get('concepts', [])[:3]])}

Could you please rephrase your question or specify which aspect you'd like me to focus on?"""
                    confidence_score = 0.6
    else:
        ai_response = "AI model not loaded. Cannot answer questions. Please check server logs."

    # Save learning session
    save_learning_session(
        user_id, 
        user_question, 
        ai_response, 
        current_pdf_metadata.get('title', 'Unknown PDF')
    )

    return jsonify({
        "answer": ai_response,
        "confidence": confidence_score,
        "source_chunk": best_chunk_index if 'best_chunk_index' in locals() else None,
        "pdf_metadata": current_pdf_metadata
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
        "text_preview": uploaded_pdf_text[:200] + "..." if len(uploaded_pdf_text) > 200 else uploaded_pdf_text
    })

@app.route('/clear_pdf', methods=['POST'])
def clear_pdf():
    """Clear the currently loaded PDF"""
    global uploaded_pdf_text, current_document_context, current_pdf_metadata
    
    uploaded_pdf_text = ""
    current_document_context = []
    current_pdf_metadata = {}
    
    return jsonify({"success": True, "message": "PDF cleared successfully"})

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
        }
    })

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
    print("🚀 Starting FEFE AI Learning Service...")
    print("📚 AI-powered PDF learning system")
    print("🔗 Integrates with FEFE backend API")
    print("🌐 Running on http://localhost:5001")
    
    # This is a very basic way to run. For production, use a WSGI server like Gunicorn.
    app.run(debug=True, port=5001, host='0.0.0.0')
