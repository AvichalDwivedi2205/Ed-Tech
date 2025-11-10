"""
Roadmap Generator Agent using LangGraph
Handles two types of users:
1. Users who don't know the roadmap (just know what to study)
2. Users who have a roadmap (PDF/image) and want it visualized
"""

from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import json
import re
from tools import OCRTool, PerplexitySearchTool, ScraperTool


class AgentState(TypedDict):
    """State of the roadmap generator agent"""
    messages: Annotated[list, lambda x, y: x + y]
    clarification_count: int
    ocr_text: str
    user_input: str
    roadmap_context: str
    actions: Annotated[list, lambda x, y: x + y]  # Track actions for UI
    final_roadmap: str


class RoadmapGeneratorAgent:
    def __init__(self, model_name: str = "gemini-2.5-flash", temperature: float = 0.7):
        self.llm = ChatGoogleGenerativeAI(model=model_name, temperature=temperature)
        self.ocr_tool = OCRTool()
        self.search_tool = PerplexitySearchTool()
        self.scraper_tool = ScraperTool()
        self.max_clarifications = 3
        self.graph = self._build_graph()
    
    def _build_graph(self):
        """Build the LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("check_input", self.check_input)
        workflow.add_node("run_ocr", self.run_ocr)
        workflow.add_node("ask_clarification", self.ask_clarification)
        workflow.add_node("generate_roadmap", self.generate_roadmap)
        
        # Set entry point
        workflow.set_entry_point("check_input")
        
        # Add edges
        workflow.add_conditional_edges(
            "check_input",
            self.should_run_ocr,
            {
                "ocr": "run_ocr",
                "clarify": "ask_clarification",
                "generate": "generate_roadmap"
            }
        )
        
        workflow.add_edge("run_ocr", "ask_clarification")
        
        workflow.add_conditional_edges(
            "ask_clarification",
            self.should_continue_clarifying,
            {
                "clarify": "ask_clarification",
                "generate": "generate_roadmap",
                "end": END
            }
        )
        
        workflow.add_edge("generate_roadmap", END)
        
        return workflow.compile()
    
    def check_input(self, state: AgentState) -> AgentState:
        """Check if input contains file/image or just text"""
        messages = state.get("messages", [])
        user_input = state.get("user_input", "")
        ocr_text = state.get("ocr_text", "")
        actions = state.get("actions", [])
        
        # Check if OCR text exists (file was uploaded)
        if ocr_text:
            actions.append({"type": "info", "message": "OCR text extracted from uploaded file"})
            return {
                **state,
                "roadmap_context": ocr_text,
                "actions": actions,
                "messages": messages + [SystemMessage(content=f"User has provided a roadmap document. Extracted text: {ocr_text[:500]}...")]
            }
        
        # Check if user input is vague (needs clarification)
        if not user_input or len(user_input.strip()) < 10:
            return {
                **state,
                "actions": actions
            }
        
        # Check if input is specific enough
        is_specific = self._is_input_specific(user_input)
        
        if not is_specific:
            return {
                **state,
                "actions": actions
            }
        
        return {
            **state,
            "actions": actions
        }
    
    def should_run_ocr(self, state: AgentState) -> Literal["ocr", "clarify", "generate"]:
        """Determine if OCR should run"""
        ocr_text = state.get("ocr_text", "")
        user_input = state.get("user_input", "")
        
        if ocr_text:
            return "ocr"
        
        # Check if input needs clarification
        if user_input and not self._is_input_specific(user_input):
            return "clarify"
        
        return "generate"
    
    def run_ocr(self, state: AgentState) -> AgentState:
        """Run OCR on uploaded file"""
        messages = state.get("messages", [])
        actions = state.get("actions", [])
        file_path = state.get("file_path", "")
        ocr_text = state.get("ocr_text", "")
        
        # If OCR text already exists, skip
        if ocr_text:
            return {
                **state,
                "roadmap_context": ocr_text,
                "actions": actions
            }
        
        if not file_path:
            return {
                **state,
                "actions": actions
            }
        
        actions.append({"type": "ocr", "message": "Running OCR on uploaded file..."})
        
        try:
            ocr_text = self.ocr_tool.run(file_path)
            actions.append({"type": "success", "message": "OCR completed successfully"})
            
            return {
                **state,
                "ocr_text": ocr_text,
                "roadmap_context": ocr_text,
                "actions": actions,
                "messages": messages + [SystemMessage(content=f"OCR extracted text: {ocr_text[:500]}...")]
            }
        except Exception as e:
            actions.append({"type": "error", "message": f"OCR failed: {str(e)}"})
            return {
                **state,
                "actions": actions,
                "messages": messages + [AIMessage(content=f"OCR failed: {str(e)}")]
            }
    
    def ask_clarification(self, state: AgentState) -> AgentState:
        """Ask clarification questions"""
        messages = state.get("messages", [])
        clarification_count = state.get("clarification_count", 0)
        user_input = state.get("user_input", "")
        roadmap_context = state.get("roadmap_context", "")
        actions = state.get("actions", [])
        
        if clarification_count >= self.max_clarifications:
            return {
                **state,
                "actions": actions
            }
        
        # Get all user messages for context
        user_messages = [msg.content for msg in messages if isinstance(msg, HumanMessage)]
        all_user_input = "\n".join(user_messages) if user_messages else user_input
        
        # Build context for clarification
        context = ""
        if roadmap_context:
            context = f"\n\nUser has provided a roadmap document with the following content:\n{roadmap_context[:1000]}"
        
        # Always ask at least one clarification question (especially about teaching style)
        # Only skip if we've already asked questions and have enough info
        if clarification_count > 0:
            # Check if we have enough information after asking questions
            if all_user_input and self._has_all_required_info(all_user_input):
                return {
                    **state,
                    "actions": actions,
                    "messages": messages + [AIMessage(content="I have enough information. Generating your roadmap...")]
                }
        
        # Determine which question to ask based on clarification count
        question_focus = ""
        if clarification_count == 0:
            question_focus = '''IMPORTANT: You MUST ask about the user's preferred teaching style. Ask: "What is your preferred teaching/learning style? (e.g., visual/hands-on/theoretical/practical/project-based/video-based/reading-based)" This is critical for generating the roadmap.'''
        elif clarification_count == 1:
            question_focus = '''Ask about their current skill level and background: "What is your current skill level in this topic? (beginner/intermediate/advanced) Do you have any prior experience or background?"'''
        elif clarification_count == 2:
            question_focus = '''Ask about their learning goals and time constraints: "What are your learning goals? (career change, skill improvement, project-based, certification, etc.) Do you have any time constraints or preferred learning pace?"'''
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are a helpful roadmap generator assistant. Your goal is to understand exactly what roadmap the user needs.

{context}

Conversation so far:
{all_user_input}

{question_focus}

Based on the conversation, determine if you need more information to generate a comprehensive roadmap. Ask ONE clear, specific question that will help you understand:
1. Their preferred teaching/learning style (CRITICAL - must be asked first if not already answered)
2. What specific topic/subject they want to learn
3. Their current skill level (beginner/intermediate/advanced)
4. Their learning goals (career change, skill improvement, project-based, etc.)
5. Time constraints or preferred learning pace
6. Specific areas of focus within the topic

If the user has provided a roadmap document, ask questions to clarify:
- What format they want the roadmap in
- Any modifications or additions they want
- Specific focus areas

IMPORTANT: Only respond with "READY_TO_GENERATE" if you have ALL the following information:
- Teaching/learning style preference
- Specific topic/subject
- Current skill level
- Learning goals

Otherwise, ask a question."""),
            MessagesPlaceholder(variable_name="messages")
        ])
        
        actions.append({"type": "thinking", "message": "Analyzing input and preparing clarification question..."})
        
        chain = prompt | self.llm
        response = chain.invoke({"messages": messages})
        
        clarification_question = response.content
        
        if "READY_TO_GENERATE" in clarification_question.upper():
            return {
                **state,
                "actions": actions,
                "messages": messages + [AIMessage(content="I have enough information. Generating your roadmap...")]
            }
        
        actions.append({"type": "clarification", "message": f"Question: {clarification_question}"})
        
        return {
            **state,
            "clarification_count": clarification_count + 1,
            "actions": actions,
            "messages": messages + [AIMessage(content=clarification_question)]
        }
    
    def should_continue_clarifying(self, state: AgentState) -> Literal["clarify", "generate", "end"]:
        """Determine if we should continue clarifying or generate roadmap"""
        clarification_count = state.get("clarification_count", 0)
        messages = state.get("messages", [])
        
        # Check if last message was "READY_TO_GENERATE"
        if messages and isinstance(messages[-1], AIMessage):
            if "READY_TO_GENERATE" in messages[-1].content.upper() or "enough information" in messages[-1].content.lower():
                return "generate"
        
        # If max clarifications reached, generate anyway
        if clarification_count >= self.max_clarifications:
            return "generate"
        
        # Count user messages vs AI clarification questions
        user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
        ai_messages = [msg for msg in messages if isinstance(msg, AIMessage)]
        
        # If we just asked a question, wait for user response (return "end" to pause)
        # In Streamlit, this will pause and wait for next user input
        if len(ai_messages) > len(user_messages):
            return "end"
        
        # If user has responded to our question
        if len(user_messages) > 0:
            # Get all user inputs combined
            all_user_input = "\n".join([msg.content for msg in user_messages])
            
            # Check if we have all required information
            if self._has_all_required_info(all_user_input):
                return "generate"
            
            # If we haven't reached max clarifications, ask another question
            if clarification_count < self.max_clarifications:
                return "clarify"
            else:
                # Max reached, generate with what we have
                return "generate"
        
        # If no user messages yet but we haven't asked a question, ask one
        if clarification_count == 0:
            return "clarify"
        
        return "end"
    
    def generate_roadmap(self, state: AgentState) -> AgentState:
        """Generate the final roadmap"""
        messages = state.get("messages", [])
        user_input = state.get("user_input", "")
        roadmap_context = state.get("roadmap_context", "")
        actions = state.get("actions", [])
        
        # Collect all user messages for context
        user_context = ""
        for msg in messages:
            if isinstance(msg, HumanMessage):
                user_context += f"\nUser: {msg.content}"
        
        # Build comprehensive context
        context_parts = []
        if roadmap_context:
            context_parts.append(f"Original roadmap document:\n{roadmap_context}")
        
        context_parts.append(f"User requirements:\n{user_context}")
        
        # Use search tool to gather information
        actions.append({"type": "search", "message": "Gathering high-quality learning resources..."})
        
        search_query = self._extract_search_query(user_input, roadmap_context)
        search_results = ""
        video_results = ""
        
        if search_query:
            try:
                search_results = self.search_tool.run(search_query)
                actions.append({"type": "success", "message": "Web search completed"})
            except Exception as e:
                actions.append({"type": "error", "message": f"Search failed: {str(e)}"})
            
            # Additional search focused on video content
            try:
                video_results = self.search_tool.run(f"{search_query} YouTube playlist tutorial")
                actions.append({"type": "success", "message": "Video resources search completed"})
            except Exception as e:
                actions.append({"type": "error", "message": f"Video search failed: {str(e)}"})
        
        # Use scraper tool for trusted sources
        actions.append({"type": "scraping", "message": "Scraping MIT OpenCourseWare and trusted sources..."})
        
        scraper_results = ""
        try:
            scraper_query = self._extract_search_query(user_input, roadmap_context)
            scraper_results = self.scraper_tool.run(scraper_query)
            actions.append({"type": "success", "message": "Content scraping completed"})
        except Exception as e:
            actions.append({"type": "error", "message": f"Scraping failed: {str(e)}"})
        
        # Build final prompt
        context_text = "\n\n".join(context_parts)
        if search_results:
            context_text += f"\n\nWeb Search Results:\n{search_results[:2000]}"
        if video_results:
            context_text += f"\n\nVideo Search Results:\n{video_results[:2000]}"
        if scraper_results:
            context_text += f"\n\nScraped Content from Trusted Sources:\n{scraper_results[:2000]}"
        
        actions.append({"type": "generating", "message": "Generating comprehensive roadmap..."})
        
        # Extract teaching style from user context
        teaching_style = self._extract_teaching_style(user_context)
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are an expert roadmap generator. Your task is to create a comprehensive, well-structured learning roadmap in JSON format ONLY.

{context_text}

CRITICAL: You MUST output ONLY valid JSON. No markdown, no explanations, no code blocks. Just pure JSON.

JSON Structure Required:
{{
  "TeachingStyle": "<extracted teaching style or 'mixed' if not specified>",
  "Subtopic1": {{
    "TopicName": "<name of the subtopic/topic>",
    "ContentList": {{
      "videos": [
        {{"title": "<title>", "url": "<url from VERIFIED CITATIONS only>", "description": "<brief description>"}},
        ...
      ],
      "blogs": [
        {{"title": "<title>", "url": "<url from VERIFIED CITATIONS only>", "description": "<brief description>"}},
        ...
      ],
      "books": [
        {{"title": "<title>", "author": "<author if available>", "description": "<brief description>"}},
        ...
      ],
      "topics": [
        "<specific topic/concept to study>",
        ...
      ]
    }},
    "SuggestedTimeToComplete": "<estimated time, e.g., '2-3 weeks', '1 month'>"
  }},
  "Subtopic2": {{
    ...
  }},
  ...
}}

Requirements:
1. Break the learning path into logical subtopics (Subtopic1, Subtopic2, etc.)
2. For each subtopic, provide:
   - A clear TopicName
   - ContentList with videos, blogs, books, and topics to study
   - SuggestedTimeToComplete estimate
3. CRITICAL: Only use URLs from the "VERIFIED CITATIONS" section in search results. Do NOT invent URLs.
4. If a URL is not available in citations, use empty string "" for url field.
5. Include 2-3 videos, 2-3 blogs, and 1-2 books per subtopic when available.
6. List specific topics/concepts to study in the "topics" array.
7. TeachingStyle should reflect the user's preference (visual, hands-on, theoretical, practical, project-based, video-based, reading-based, or mixed).

Output ONLY the JSON object, nothing else."""),
            MessagesPlaceholder(variable_name="messages")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({"messages": messages})
        
        roadmap_text = response.content.strip()
        
        # Extract JSON from response (remove markdown code blocks if present)
        roadmap_json_str = self._extract_json_from_response(roadmap_text)
        
        # Parse and validate JSON
        try:
            roadmap_json = json.loads(roadmap_json_str)
            
            # Ensure TeachingStyle is set
            if "TeachingStyle" not in roadmap_json or not roadmap_json["TeachingStyle"]:
                roadmap_json["TeachingStyle"] = teaching_style or "mixed"
            
            # Convert to string for storage
            roadmap_json_str = json.dumps(roadmap_json, indent=2)
            
            actions.append({"type": "success", "message": "Roadmap generated successfully!"})
            
            return {
                **state,
                "final_roadmap": roadmap_json_str,
                "actions": actions,
                "messages": messages + [AIMessage(content=f"Roadmap generated successfully! Here's your structured learning path:\n\n```json\n{roadmap_json_str}\n```")]
            }
        except json.JSONDecodeError as e:
            actions.append({"type": "error", "message": f"Failed to parse JSON: {str(e)}"})
            # Try to fix common JSON issues
            roadmap_json_str = self._fix_json(roadmap_json_str)
            try:
                roadmap_json = json.loads(roadmap_json_str)
                roadmap_json["TeachingStyle"] = teaching_style or roadmap_json.get("TeachingStyle", "mixed")
                roadmap_json_str = json.dumps(roadmap_json, indent=2)
                actions.append({"type": "success", "message": "Roadmap generated successfully (after JSON fix)!"})
                return {
                    **state,
                    "final_roadmap": roadmap_json_str,
                    "actions": actions,
                    "messages": messages + [AIMessage(content=f"Roadmap generated successfully! Here's your structured learning path:\n\n```json\n{roadmap_json_str}\n```")]
                }
            except:
                # Fallback: return as-is
                return {
                    **state,
                    "final_roadmap": roadmap_text,
                    "actions": actions,
                    "messages": messages + [AIMessage(content=f"Roadmap generated. Note: JSON parsing had issues, but content is available:\n\n{roadmap_text}")]
                }
    
    def _is_input_specific(self, text: str) -> bool:
        """Check if user input is specific enough"""
        if not text or len(text.strip()) < 10:
            return False
        
        # Simple heuristic: check for specific keywords
        specific_indicators = [
            "learn", "study", "roadmap", "path", "course", "tutorial",
            "beginner", "intermediate", "advanced", "project", "career"
        ]
        
        text_lower = text.lower()
        has_indicator = any(indicator in text_lower for indicator in specific_indicators)
        
        # If very short or no indicators, likely needs clarification
        if len(text.strip()) < 20 and not has_indicator:
            return False
        
        return True
    
    def _has_all_required_info(self, text: str) -> bool:
        """Check if we have all required information including teaching style"""
        if not text or len(text.strip()) < 10:
            return False
        
        text_lower = text.lower()
        
        # Check for teaching style indicators
        teaching_style_indicators = [
            "visual", "hands-on", "theoretical", "practical", "project-based",
            "video-based", "reading-based", "interactive", "lecture", "tutorial"
        ]
        has_teaching_style = any(indicator in text_lower for indicator in teaching_style_indicators)
        
        # Check for topic/subject
        topic_indicators = ["learn", "study", "roadmap", "topic", "subject", "course"]
        has_topic = any(indicator in text_lower for indicator in topic_indicators)
        
        # Check for skill level
        skill_level_indicators = ["beginner", "intermediate", "advanced", "novice", "expert"]
        has_skill_level = any(indicator in text_lower for indicator in skill_level_indicators)
        
        # If we have teaching style, topic, and some indication of goals/level, we're good
        # We'll be lenient - if we have topic and teaching style, that's enough
        return has_topic and (has_teaching_style or len(text.strip()) > 50)
    
    def _extract_teaching_style(self, user_context: str) -> str:
        """Extract teaching style from user context"""
        if not user_context:
            return "mixed"
        
        text_lower = user_context.lower()
        
        teaching_styles = {
            "visual": ["visual", "diagram", "chart", "graph", "image"],
            "hands-on": ["hands-on", "hands on", "practical", "practice", "project"],
            "theoretical": ["theoretical", "theory", "concept", "principle"],
            "video-based": ["video", "youtube", "watch", "tutorial video"],
            "reading-based": ["read", "book", "article", "text"],
            "project-based": ["project", "build", "create", "implement"]
        }
        
        for style, keywords in teaching_styles.items():
            if any(keyword in text_lower for keyword in keywords):
                return style
        
        return "mixed"
    
    def _extract_json_from_response(self, text: str) -> str:
        """Extract JSON from LLM response, removing markdown code blocks if present"""
        text = text.strip()
        
        # Remove markdown code blocks
        if text.startswith("```json"):
            text = text[7:]  # Remove ```json
        elif text.startswith("```"):
            text = text[3:]  # Remove ```
        
        if text.endswith("```"):
            text = text[:-3]  # Remove closing ```
        
        text = text.strip()
        
        # Find JSON object boundaries
        if text.startswith("{"):
            # Find matching closing brace
            brace_count = 0
            for i, char in enumerate(text):
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        return text[:i+1]
        
        return text
    
    def _fix_json(self, json_str: str) -> str:
        """Attempt to fix common JSON issues"""
        # Remove trailing commas before closing braces/brackets
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # Fix single quotes to double quotes (basic)
        json_str = json_str.replace("'", '"')
        
        return json_str
    
    def _extract_search_query(self, user_input: str, roadmap_context: str) -> str:
        """Extract search query from user input"""
        # Combine user input and roadmap context
        combined = f"{user_input} {roadmap_context}".strip()
        
        # Extract key terms (simple approach)
        # In production, you might use NLP to extract key phrases
        if len(combined) > 100:
            # Take first 100 chars as query
            return combined[:100]
        
        return combined
    
    def run(self, user_input: str, file_path: str = None, ocr_text: str = None) -> dict:
        """Run the agent"""
        initial_state = {
            "messages": [HumanMessage(content=user_input)],
            "clarification_count": 0,
            "user_input": user_input,
            "file_path": file_path,
            "ocr_text": ocr_text or "",
            "roadmap_context": "",
            "actions": [],
            "final_roadmap": ""
        }
        
        final_state = self.graph.invoke(initial_state)
        return final_state

