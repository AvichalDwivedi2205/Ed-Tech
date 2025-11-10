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
        
        # Check if we have enough information already
        if all_user_input and self._is_input_specific(all_user_input) and clarification_count == 0:
            # Skip clarification if input is already specific
            return {
                **state,
                "actions": actions,
                "messages": messages + [AIMessage(content="I have enough information. Generating your roadmap...")]
            }
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are a helpful roadmap generator assistant. Your goal is to understand exactly what roadmap the user needs.

{context}

Conversation so far:
{all_user_input}

Based on the conversation, determine if you need more information to generate a comprehensive roadmap. Ask ONE clear, specific question that will help you understand:
1. What specific topic/subject they want to learn
2. Their current skill level (beginner/intermediate/advanced)
3. Their learning goals (career change, skill improvement, project-based, etc.)
4. Time constraints or preferred learning pace
5. Specific areas of focus within the topic

If the user has provided a roadmap document, ask questions to clarify:
- What format they want the roadmap in
- Any modifications or additions they want
- Specific focus areas

If you have enough information from the conversation, respond with "READY_TO_GENERATE" instead of a question."""),
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
        
        # If we just asked a question and haven't received a response yet, end to wait
        if len(ai_messages) > len(user_messages):
            return "end"
        
        # If user has responded to our question
        if len(user_messages) > 0:
            latest_user_input = user_messages[-1].content
            # Check if input is now specific enough or we've reached max clarifications
            if self._is_input_specific(latest_user_input) or clarification_count >= self.max_clarifications - 1:
                return "generate"
            # Otherwise, ask another clarification
            if clarification_count < self.max_clarifications:
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
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are an expert roadmap generator. Your task is to create a comprehensive, well-structured learning roadmap based on the user's requirements.

{context_text}

Generate a detailed roadmap that includes:
1. Clear learning path broken into digestible stages/phases (use H2 headings for each stage).
2. Specific topics/concepts to learn in each stage.
3. For EVERY topic in each stage, provide curated resource lists grouped as:
   - **YouTube Videos** (2-3 links minimum, include markdown links with title + short blurb)
   - **Articles / Blog Posts** (2-3 links minimum)
   - **Courses / MOOCs** (1-2 links, include platform name)
   - **Books / References** (if available)
   - **Hands-on Tutorials or Labs** (if available)
4. Prerequisites for each stage.
5. Estimated time for each stage.
6. Practice projects or exercises with ideas and evaluation criteria.
7. Milestones and checkpoints with measurable outcomes.

Resource Requirements:
- CRITICAL: Only use URLs from the "VERIFIED CITATIONS" section in search results. Do NOT invent, make up, or hallucinate URLs.
- Use URLs exactly as provided in citations. Format links as `[Title](URL)` using ONLY verified URLs.
- If a specific resource category cannot be satisfied from verified citations, clearly state "Add more resources here - search for [topic]" as a placeholder.
- Include a "Why these resources" note for each category explaining the learning value.
- Include at least one community or discussion resource (e.g., forums, Discord, Reddit) if available in citations.
- NEVER create fake URLs or links that don't exist. If you don't have a verified URL, say so explicitly.

Presentation Requirements:
- Use consistent markdown formatting with clear hierarchy.
- Add a brief summary paragraph at the top of the roadmap.
- Add a concluding "Next Steps" section with guidance on continuing learning, certification options, and portfolio tips.

If the user provided an existing roadmap document, enhance it, organize it better, and add missing elements based on the search results and scraped content. Keep the original intent but improve clarity, ordering, and resource richness."""),
            MessagesPlaceholder(variable_name="messages")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({"messages": messages})
        
        roadmap = response.content
        
        actions.append({"type": "success", "message": "Roadmap generated successfully!"})
        
        return {
            **state,
            "final_roadmap": roadmap,
            "actions": actions,
            "messages": messages + [AIMessage(content=roadmap)]
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

