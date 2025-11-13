"""
Quiz Generator Sub-Agent using LangGraph
Generates quizzes with overlap prevention
"""
import json
import re
from typing import TypedDict, Annotated, List, Dict, Literal
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from .content_context import ContextManager


class QuizState(TypedDict):
    """State for quiz generation sub-agent"""
    content: str
    subtopic_name: str
    subtopic_id: str
    key_concepts: List[str]
    questions: List[Dict]
    context_manager: ContextManager
    actions: Annotated[list, lambda x, y: x + y]
    quiz_complete: bool


class QuizGenerator:
    """Generate quizzes for subtopics with no overlap"""
    
    def __init__(self, llm: ChatGoogleGenerativeAI, context_manager: ContextManager):
        self.llm = llm
        self.context_manager = context_manager
        self.graph = self._build_graph()
    
    def _build_graph(self):
        """Build LangGraph workflow for quiz generation"""
        workflow = StateGraph(QuizState)
        
        workflow.add_node("analyze_content", self.analyze_content)
        workflow.add_node("generate_questions", self.generate_questions)
        workflow.add_node("check_overlap", self.check_overlap)
        workflow.add_node("format_quiz", self.format_quiz)
        
        workflow.set_entry_point("analyze_content")
        workflow.add_edge("analyze_content", "generate_questions")
        workflow.add_edge("generate_questions", "check_overlap")
        workflow.add_edge("check_overlap", "format_quiz")
        workflow.add_edge("format_quiz", END)
        
        return workflow.compile()
    
    def analyze_content(self, state: QuizState) -> QuizState:
        """Extract key concepts from content"""
        content = state.get("content", "")
        actions = state.get("actions", [])
        
        # Extract key concepts using LLM
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are an expert at analyzing educational content and extracting key concepts.
Extract the main concepts, topics, and important points that should be tested in a quiz.
Return a JSON array of concept strings."""),
            HumanMessage(content=f"Extract key concepts from this content:\n\n{content[:2000]}\n\nReturn JSON array of concepts.")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({})
        
        try:
            key_concepts = json.loads(response.content.strip())
            if isinstance(key_concepts, list):
                actions.append({"type": "info", "message": f"Extracted {len(key_concepts)} key concepts"})
            else:
                key_concepts = []
        except:
            # Fallback: extract from content structure
            key_concepts = self._extract_concepts_fallback(content)
            actions.append({"type": "info", "message": f"Extracted {len(key_concepts)} key concepts (fallback method)"})
        
        return {
            **state,
            "key_concepts": key_concepts if isinstance(key_concepts, list) else [],
            "actions": actions
        }
    
    def _extract_concepts_fallback(self, content: str) -> List[str]:
        """Fallback method to extract concepts from content"""
        concepts = []
        lines = content.split('\n')
        
        # Look for headings and bullet points
        for line in lines:
            line = line.strip()
            if line.startswith('#'):
                concepts.append(line.strip('#').strip())
            elif line.startswith('-') or line.startswith('*'):
                concepts.append(line.strip('-*').strip())
        
        return concepts[:10]  # Limit to 10 concepts
    
    def generate_questions(self, state: QuizState) -> QuizState:
        """Generate questions using LLM"""
        content = state.get("content", "")
        subtopic_name = state.get("subtopic_name", "")
        key_concepts = state.get("key_concepts", [])
        num_questions = 5
        
        # Get existing questions to avoid overlap
        existing_questions = self.context_manager.get_all_quiz_questions()
        existing_text = "\n".join([
            f"Q: {q.get('question', '')}" 
            for q in existing_questions[-20:]  # Last 20 for context
        ])
        
        concepts_text = "\n".join([f"- {c}" for c in key_concepts[:10]]) if key_concepts else "All concepts from the content"
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are an expert quiz generator for educational content.

Your task is to generate {num_questions} quiz questions based on the provided subtopic content.

CRITICAL REQUIREMENTS:
1. Questions must be based ONLY on the provided content
2. NO OVERLAP with existing questions (see below)
3. Mix of question types: multiple_choice, short_answer, true_false
4. Questions should test understanding, not just memorization
5. Include difficulty levels (easy, medium, hard)
6. Each question must have a clear explanation

EXISTING QUESTIONS (DO NOT REPEAT THESE):
{existing_text if existing_text else "No existing questions yet."}

Output format (JSON array):
[
  {{
    "question": "Question text",
    "type": "multiple_choice|short_answer|true_false",
    "options": ["option1", "option2", "option3", "option4"],  // only for multiple_choice
    "correct_answer": "correct answer",
    "explanation": "Why this is correct",
    "difficulty": "easy|medium|hard"
  }},
  ...
]

Output ONLY valid JSON array, nothing else."""),
            HumanMessage(content=f"""Generate {num_questions} quiz questions for:

Subtopic: {subtopic_name}

Key Concepts to Cover:
{concepts_text}

Content:
{content[:3000]}

Generate {num_questions} unique questions that test understanding of this content. Ensure no overlap with existing questions.""")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({})
        
        questions = []
        response_text = response.content.strip() if hasattr(response, 'content') else str(response)
        
        # Try multiple parsing strategies
        try:
            # Strategy 1: Direct JSON parse
            questions = json.loads(response_text)
            if not isinstance(questions, list):
                questions = []
        except json.JSONDecodeError:
            try:
                # Strategy 2: Extract JSON from markdown code blocks
                json_match = re.search(r'```(?:json)?\s*(\[.*?\])', response_text, re.DOTALL)
                if json_match:
                    questions = json.loads(json_match.group(1))
                else:
                    # Strategy 3: Find JSON array in text
                    json_match = re.search(r'(\[[\s\S]*\])', response_text)
                    if json_match:
                        questions = json.loads(json_match.group(1))
            except:
                # Strategy 4: Try to fix common JSON issues
                try:
                    # Remove markdown formatting
                    cleaned = re.sub(r'```(?:json|python)?\s*', '', response_text)
                    cleaned = re.sub(r'```\s*$', '', cleaned)
                    # Try to find and extract array
                    array_match = re.search(r'(\[[\s\S]{50,}\])', cleaned, re.MULTILINE)
                    if array_match:
                        questions = json.loads(array_match.group(1))
                except Exception as e:
                    # Last resort: log error but continue
                    print(f"Quiz generation JSON parse error: {str(e)}")
                    print(f"Response text: {response_text[:500]}")
                    questions = []
        
        final_questions = questions if isinstance(questions, list) else []
        
        # Debug output
        if len(final_questions) == 0:
            actions = state.get("actions", [])
            actions.append({
                "type": "warning", 
                "message": f"Quiz generation returned 0 questions. Response length: {len(response_text)} chars"
            })
            # Print for debugging
            print(f"Quiz generation failed. Response preview: {response_text[:500]}")
        
        return {
            **state,
            "questions": final_questions,
            "actions": state.get("actions", []) + [
                {"type": "success", "message": f"Generated {len(final_questions)} questions"}
            ]
        }
    
    def check_overlap(self, state: QuizState) -> QuizState:
        """Check for question overlap and filter"""
        questions = state.get("questions", [])
        filtered_questions = []
        actions = state.get("actions", [])
        
        for q in questions:
            question_text = q.get("question", "")
            if question_text and not self.context_manager.check_question_overlap(question_text):
                filtered_questions.append(q)
            else:
                actions.append({"type": "warning", "message": f"Filtered overlapping question: {question_text[:50]}..."})
        
        return {
            **state,
            "questions": filtered_questions,
            "actions": actions
        }
    
    def format_quiz(self, state: QuizState) -> QuizState:
        """Format quiz as structured JSON"""
        subtopic_id = state.get("subtopic_id", "")
        questions = state.get("questions", [])
        
        quiz = {
            "subtopic_id": subtopic_id,
            "subtopic_name": state.get("subtopic_name", ""),
            "num_questions": len(questions),
            "questions": questions
        }
        
        return {
            **state,
            "questions": questions,  # Keep questions in state
            "quiz_complete": True,
            "actions": state.get("actions", []) + [
                {"type": "success", "message": f"Quiz formatted with {len(questions)} questions"}
            ]
        }
    
    def generate_subtopic_quiz(self, content: str, subtopic_name: str, 
                              subtopic_id: str, num_questions: int = 5) -> Dict:
        """Generate quiz for a subtopic (convenience method)"""
        initial_state = {
            "content": content,
            "subtopic_name": subtopic_name,
            "subtopic_id": subtopic_id,
            "key_concepts": [],
            "questions": [],
            "context_manager": self.context_manager,
            "actions": [],
            "quiz_complete": False
        }
        
        result = self.graph.invoke(initial_state)
        
        return {
            "subtopic_id": subtopic_id,
            "subtopic_name": subtopic_name,
            "questions": result.get("questions", []),
            "num_questions": len(result.get("questions", []))
        }
    
    def generate_mega_quiz(self, all_subtopics_content: List[Dict], 
                          num_questions: int = 15) -> Dict:
        """Generate comprehensive quiz covering all subtopics"""
        # Combine all content
        combined_content = "\n\n".join([
            f"=== {subtopic.get('name', 'Unknown')} ===\n{subtopic.get('content', '')}"
            for subtopic in all_subtopics_content
        ])
        
        # Get all existing questions
        existing_questions = self.context_manager.get_all_quiz_questions()
        existing_text = "\n".join([
            f"Q: {q.get('question', '')}" 
            for q in existing_questions
        ])
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are an expert quiz generator. Generate a comprehensive quiz covering multiple subtopics.

CRITICAL REQUIREMENTS:
1. Generate {num_questions} questions covering ALL subtopics
2. NO OVERLAP with existing questions (see below)
3. Mix question types and difficulty levels
4. Questions should test comprehensive understanding across subtopics

EXISTING QUESTIONS (DO NOT REPEAT):
{existing_text[:2000] if existing_text else "No existing questions."}

Output JSON array format same as subtopic quiz."""),
            HumanMessage(content=f"""Generate {num_questions} comprehensive questions covering:

{combined_content[:5000]}

Ensure questions test understanding across all subtopics.""")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({})
        
        try:
            questions = json.loads(response.content.strip())
            if not isinstance(questions, list):
                questions = []
        except:
            questions = []
        
        # Filter overlapping questions
        filtered_questions = []
        for q in questions:
            question_text = q.get("question", "")
            if question_text and not self.context_manager.check_question_overlap(question_text):
                filtered_questions.append(q)
        
        return {
            "quiz_type": "mega_quiz",
            "num_questions": len(filtered_questions),
            "questions": filtered_questions
        }

