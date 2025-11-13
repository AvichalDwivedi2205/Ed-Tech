"""
Context Manager for Content Creator Agent
Maintains state across subtopics to ensure continuity
"""
import json
import os
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class SubtopicContext:
    """Context for a completed subtopic"""
    subtopic_id: str
    topic_name: str
    summary: str
    key_concepts: List[str]
    equations: List[str]  # LaTeX equations used
    terminology: List[str]
    quiz_questions: List[Dict]  # Questions generated
    generated_at: str


class ContextManager:
    """Manages context across subtopics"""
    
    def __init__(self, context_file: Optional[str] = None):
        if context_file is None:
            # Default to backend directory
            import os
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            context_file = os.path.join(backend_dir, "content_context.json")
        self.context_file = context_file
        self.context = self._load_context()
    
    def _load_context(self) -> Dict:
        """Load context from file"""
        if os.path.exists(self.context_file):
            try:
                with open(self.context_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                # If file is corrupted, start fresh
                return self._get_default_context()
        return self._get_default_context()
    
    def _get_default_context(self) -> Dict:
        """Get default empty context"""
        return {
            "roadmap_json": None,
            "teaching_style": "normal",
            "completed_subtopics": [],
            "current_subtopic": None,
            "all_quiz_questions": [],
            "content_history": []
        }
    
    def save_context(self):
        """Save context to file"""
        try:
            with open(self.context_file, 'w') as f:
                json.dump(self.context, f, indent=2)
        except IOError as e:
            print(f"Warning: Failed to save context: {e}")
    
    def add_completed_subtopic(self, subtopic_context: SubtopicContext):
        """Add a completed subtopic to context"""
        self.context["completed_subtopics"].append(asdict(subtopic_context))
        self.context["all_quiz_questions"].extend(subtopic_context.quiz_questions)
        self.save_context()
    
    def get_context_summary(self) -> str:
        """Get summary of all completed subtopics for LLM context"""
        if not self.context["completed_subtopics"]:
            return "No previous subtopics completed yet."
        
        summary_parts = []
        for subtopic in self.context["completed_subtopics"]:
            key_concepts_str = ', '.join(subtopic.get('key_concepts', [])[:5])
            num_equations = len(subtopic.get('equations', []))
            summary_parts.append(f"""
Subtopic: {subtopic.get('topic_name', 'Unknown')}
Key Concepts: {key_concepts_str}
Equations Covered: {num_equations} equations
""")
        return "\n".join(summary_parts)
    
    def get_previous_equations(self) -> List[str]:
        """Get all equations from previous subtopics"""
        equations = []
        for subtopic in self.context["completed_subtopics"]:
            equations.extend(subtopic.get("equations", []))
        return equations
    
    def check_question_overlap(self, new_question: str) -> bool:
        """Check if a question overlaps with existing ones (simple check)"""
        if not new_question:
            return True
        
        # Simple text similarity - can be enhanced with embeddings
        new_lower = new_question.lower().strip()
        if not new_lower:
            return True
        
        for existing_q in self.context["all_quiz_questions"]:
            existing_text = existing_q.get("question", "").lower().strip()
            if not existing_text:
                continue
            # Check for significant overlap (more than 50% similarity)
            if self._text_similarity(new_lower, existing_text) > 0.5:
                return True
        return False
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        """Simple word overlap similarity"""
        words1 = set(text1.split())
        words2 = set(text2.split())
        if not words1 or not words2:
            return 0.0
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        return len(intersection) / len(union) if union else 0.0
    
    def get_all_quiz_questions(self) -> List[Dict]:
        """Get all quiz questions from all subtopics"""
        return self.context.get("all_quiz_questions", [])
    
    def get_completed_subtopic_ids(self) -> List[str]:
        """Get list of completed subtopic IDs"""
        return [s.get("subtopic_id") for s in self.context.get("completed_subtopics", [])]
    
    def reset_context(self):
        """Reset context (useful for testing)"""
        self.context = self._get_default_context()
        self.save_context()
    
    def set_roadmap(self, roadmap_json: Dict):
        """Set the roadmap JSON"""
        self.context["roadmap_json"] = roadmap_json
        self.save_context()
    
    def set_teaching_style(self, teaching_style: str):
        """Set the teaching style"""
        self.context["teaching_style"] = teaching_style
        self.save_context()

