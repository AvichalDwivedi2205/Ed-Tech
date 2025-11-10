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
    waiting_for_response: bool  # Track if we're waiting for user response


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
        clarification_count = state.get("clarification_count", 0)
        messages = state.get("messages", [])
        
        if ocr_text:
            return "ocr"
        
        # If we're in an ongoing conversation (clarification_count > 0), skip this node
        # The should_continue_clarifying node will handle the routing
        if clarification_count > 0:
            return "clarify"
        
        # First time user input - check if we need to ask clarification questions
        # CRITICAL: We MUST ask at least 2 questions (minimum requirement)
        
        # Get all user messages to check if we have teaching style
        user_messages = [msg.content for msg in messages if isinstance(msg, HumanMessage)]
        all_user_input = "\n".join(user_messages) if user_messages else user_input
        
        # If we haven't asked at least 2 questions yet, we need clarification
        if clarification_count < 2:
            return "clarify"
        
        # If we don't have teaching style info, we need clarification
        if not self._has_all_required_info(all_user_input):
            return "clarify"
        
        # If input is not specific enough, clarify
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
        
        # CRITICAL: We MUST ask at least 2 questions (minimum requirement)
        # Only skip to generation if we've asked at least 2 questions AND have enough info
        if clarification_count >= 2:
            # After asking at least 2 questions, check if we have enough information
            if all_user_input and self._has_all_required_info(all_user_input):
                return {
                    **state,
                    "actions": actions,
                    "messages": messages + [AIMessage(content="I have enough information. Generating your roadmap...")]
                }
        
        # Determine which question to ask based on clarification count
        question_focus = ""
        if clarification_count == 0:
            question_focus = '''IMPORTANT: You MUST ask about the user's preferred teaching style. Ask: "What is your preferred teaching/learning style? (e.g., fast-paced/in-depth/normal)" This is critical for generating the roadmap.'''
        elif clarification_count == 1:
            question_focus = '''Ask about their current skill level and background: "What is your current skill level in this topic? (beginner/intermediate/advanced) Do you have any prior experience or background?"'''
        elif clarification_count == 2:
            question_focus = '''Ask about their learning goals and time constraints: "What are your learning goals? (career change, skill improvement, project-based, certification, etc.) Do you have any time constraints or preferred learning pace?"'''
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are a helpful roadmap generator assistant. Your goal is to understand exactly what roadmap the user needs.

Current clarification round: {clarification_count} (you have asked {clarification_count} questions so far)
MINIMUM REQUIREMENT: You MUST ask at least 2 questions before generating the roadmap.

{context}

Conversation so far:
{all_user_input}

{question_focus}

CRITICAL INSTRUCTIONS:
- You MUST ask at least 2 questions before generating the roadmap (minimum requirement)
- If this is clarification round 0 or 1, you MUST ask a question. DO NOT say "READY_TO_GENERATE" yet.
- You MUST ask about teaching/learning style preference FIRST if it hasn't been mentioned.
- Ask ONE clear, specific question that will help you understand:
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

ONLY respond with "READY_TO_GENERATE" if:
- You have asked AT LEAST 2 questions (clarification_count >= 2) AND
- You have ALL the following information:
  - Teaching/learning style preference (explicitly mentioned)
  - Specific topic/subject
  - Current skill level
  - Learning goals

If this is clarification round 0 or 1, you MUST ask a question. Do not skip this step."""),
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
            "messages": messages + [AIMessage(content=clarification_question)],
            "waiting_for_response": True  # Set flag to wait for user
        }
    
    def should_continue_clarifying(self, state: AgentState) -> Literal["clarify", "generate", "end"]:
        """Determine if we should continue clarifying or generate roadmap"""
        clarification_count = state.get("clarification_count", 0)
        messages = state.get("messages", [])
        waiting_for_response = state.get("waiting_for_response", False)
        
        # If we're waiting for user response, end here
        if waiting_for_response:
            return "end"
        
        # Check if last message was "READY_TO_GENERATE"
        if messages and isinstance(messages[-1], AIMessage):
            if "READY_TO_GENERATE" in messages[-1].content.upper() or "enough information" in messages[-1].content.lower():
                # Only allow generation if we've asked at least 2 questions
                if clarification_count >= 2:
                    return "generate"
                else:
                    # Force another question if we haven't asked at least 2
                    return "clarify"
        
        # If max clarifications reached (3), generate anyway
        if clarification_count >= self.max_clarifications:
            return "generate"
        
        # CRITICAL: We MUST ask at least 2 questions (minimum requirement)
        # Don't allow generation until we've asked at least 2 questions
        if clarification_count < 2:
            # Count user messages vs AI clarification questions
            user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
            
            # If user has responded, we need to ask another question (until we reach 2)
            if len(user_messages) > 0:
                return "clarify"
            else:
                # No user response yet, but we need to ask questions
                return "clarify"
        
        # We've asked at least 2 questions, now check if we have enough info
        user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
        
        # If user has responded to our questions
        if len(user_messages) > 0:
            # Get all user inputs combined
            all_user_input = "\n".join([msg.content for msg in user_messages])
            
            # Check if we have all required information
            if self._has_all_required_info(all_user_input):
                return "generate"
            
            # If we haven't reached max clarifications (3), ask another question
            if clarification_count < self.max_clarifications:
                return "clarify"
            else:
                # Max reached (3), generate with what we have
                return "generate"
        
        # If no user messages yet but we haven't asked enough questions, ask one
        if clarification_count < 2:
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
        
        # Extract teaching style from user context
        teaching_style = self._extract_teaching_style(user_context)
        
        # STEP 1: Generate subtopic outline first
        actions.append({"type": "generating", "message": "Creating subtopic outline..."})
        subtopic_outline = self._generate_subtopic_outline(user_input, roadmap_context, user_context, teaching_style)
        
        # STEP 2: Search for resources specific to each subtopic
        actions.append({"type": "search", "message": "Searching for subtopic-specific learning resources..."})
        subtopic_resources = {}
        
        if subtopic_outline:
            # Extract subtopics from outline
            subtopics = self._extract_subtopics_from_outline(subtopic_outline)
            
            # Search for resources for each subtopic
            for subtopic_name, subtopic_topics in subtopics.items():
                if subtopic_topics:
                    # Create search query specific to this subtopic
                    topic_keywords = ", ".join(subtopic_topics[:3])  # Use first 3 topics as keywords
                    search_query = f"{user_input} {subtopic_name} {topic_keywords}"
                    
                    subtopic_videos = ""
                    subtopic_blogs = ""
                    subtopic_books = ""
                    
                    try:
                        # Search for videos specific to this subtopic
                        video_query = f"{search_query} YouTube tutorial video course"
                        subtopic_videos = self.search_tool.run(video_query, max_results=10)
                        actions.append({"type": "success", "message": f"Found video resources for {subtopic_name}"})
                    except Exception as e:
                        actions.append({"type": "error", "message": f"Video search failed for {subtopic_name}: {str(e)}"})
                    
                    try:
                        # Search for blogs/articles specific to this subtopic
                        blog_query = f"{search_query} blog article tutorial guide"
                        subtopic_blogs = self.search_tool.run(blog_query, max_results=10)
                        actions.append({"type": "success", "message": f"Found blog resources for {subtopic_name}"})
                    except Exception as e:
                        actions.append({"type": "error", "message": f"Blog search failed for {subtopic_name}: {str(e)}"})
                    
                    try:
                        # Search for books specific to this subtopic
                        book_query = f"{search_query} book textbook reference"
                        subtopic_books = self.search_tool.run(book_query, max_results=8)
                        actions.append({"type": "success", "message": f"Found book resources for {subtopic_name}"})
                    except Exception as e:
                        actions.append({"type": "error", "message": f"Book search failed for {subtopic_name}: {str(e)}"})
                    
                    # Store resources for this subtopic
                    subtopic_resources[subtopic_name] = {
                        "topics": subtopic_topics,
                        "videos": subtopic_videos,
                        "blogs": subtopic_blogs,
                        "books": subtopic_books
                    }
        
        # Fallback: If no subtopics extracted, do general search
        if not subtopic_resources:
            search_query = self._extract_search_query(user_input, roadmap_context)
            general_videos = ""
            general_blogs = ""
            general_books = ""
            
            if search_query:
                try:
                    general_videos = self.search_tool.run(f"{search_query} YouTube tutorial course", max_results=15)
                except:
                    pass
                try:
                    general_blogs = self.search_tool.run(f"{search_query} blog article tutorial guide", max_results=15)
                except:
                    pass
                try:
                    general_books = self.search_tool.run(f"{search_query} book textbook reference guide", max_results=10)
                except:
                    pass
            
            subtopic_resources["General"] = {
                "topics": [],
                "videos": general_videos,
                "blogs": general_blogs,
                "books": general_books
            }
        
        # Use scraper tool for trusted sources
        actions.append({"type": "scraping", "message": "Scraping MIT OpenCourseWare and trusted sources..."})
        
        scraper_results = ""
        try:
            scraper_query = self._extract_search_query(user_input, roadmap_context)
            scraper_results = self.scraper_tool.run(scraper_query)
            actions.append({"type": "success", "message": "Content scraping completed"})
        except Exception as e:
            actions.append({"type": "error", "message": f"Scraping failed: {str(e)}"})
        
        # Build final prompt with subtopic-specific resources
        context_text = "\n\n".join(context_parts)
        
        # Add subtopic outline
        if subtopic_outline:
            context_text += f"\n\n=== SUBTOPIC OUTLINE ===\n{subtopic_outline}"
        
        # Add subtopic-specific resources
        context_text += "\n\n=== SUBTOPIC-SPECIFIC RESOURCES ===\n"
        for subtopic_name, resources in subtopic_resources.items():
            context_text += f"\n--- Resources for: {subtopic_name} ---\n"
            context_text += f"Topics: {', '.join(resources['topics'])}\n"
            if resources['videos']:
                context_text += f"\nVIDEOS:\n{resources['videos'][:2000]}\n"
            if resources['blogs']:
                context_text += f"\nBLOGS/ARTICLES:\n{resources['blogs'][:2000]}\n"
            if resources['books']:
                context_text += f"\nBOOKS:\n{resources['books'][:1500]}\n"
            context_text += "\n"
        
        if scraper_results:
            context_text += f"\n\n=== TRUSTED SOURCES (MIT OCW, etc.) ===\n{scraper_results[:2000]}"
        
        actions.append({"type": "generating", "message": "Generating comprehensive roadmap with matched resources..."})
        
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
        {{"title": "<exact title from search results>", "url": "<exact URL from VERIFIED CITATIONS>", "description": "<explain what topics this video teaches and what the user will learn>"}},
        {{"title": "<exact title from search results>", "url": "<exact URL from VERIFIED CITATIONS>", "description": "<explain what topics this video teaches and what the user will learn>"}}
      ],
      "blogs": [
        {{"title": "<exact title from search results>", "url": "<exact URL from VERIFIED CITATIONS>", "description": "<explain what topics this blog/article teaches and what the user will learn>"}},
        {{"title": "<exact title from search results>", "url": "<exact URL from VERIFIED CITATIONS>", "description": "<explain what topics this blog/article teaches and what the user will learn>"}}
      ],
      "books": [
        {{"title": "<exact title from search results>", "author": "<author if available>", "description": "<explain what topics this book covers and what the user will learn>"}}
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
1. Break the learning path into logical subtopics (Subtopic1, Subtopic2, etc.) matching the SUBTOPIC OUTLINE provided above.
2. For each subtopic, provide:
   - A clear TopicName (use the subtopic names from the SUBTOPIC OUTLINE)
   - ContentList with videos, blogs, books, and topics to study
   - SuggestedTimeToComplete estimate
3. CRITICAL - USE SUBTOPIC-SPECIFIC RESOURCES: 
   - Above, you will see "=== SUBTOPIC-SPECIFIC RESOURCES ===" with resources organized by subtopic name
   - For each subtopic, you MUST use ONLY the resources from its corresponding section in SUBTOPIC-SPECIFIC RESOURCES
   - For example, if you have "Resources for: Signals and Systems", use ONLY the videos/blogs/books from that section for that subtopic
   - DO NOT use generic "how to learn faster" resources - those are NOT relevant to the actual topics
   - DO NOT reuse the same resources across multiple subtopics - each subtopic gets its own unique resources
   - If a subtopic section has resources, you MUST use them. If it doesn't have resources, you may use resources from the "General" section or trusted sources
4. CRITICAL RESOURCE MATCHING: Each subtopic MUST have resources (videos, blogs, books) that are SPECIFICALLY relevant to the topics listed in that subtopic's "topics" array. 
   - Match resources from the SUBTOPIC-SPECIFIC RESOURCES section to each subtopic based on the subtopic name
   - For example, if Subtopic1 is "Signals and Systems" with topics ["Fourier Transform", "Convolution"], use the resources from "Resources for: Signals and Systems" section
   - Each subtopic should have DIFFERENT resources tailored to its specific topics
   - NEVER use generic learning technique resources (like "How to Learn Anything Faster") - these are NOT about the actual subject matter
5. CRITICAL URL EXTRACTION: 
   - Extract URLs EXACTLY as shown in the VERIFIED CITATIONS sections in SUBTOPIC-SPECIFIC RESOURCES
   - Copy URLs verbatim - do not modify them
   - Each resource MUST have a valid URL from the search results
   - If you cannot find a URL for a resource in the search results, use empty string "" but try to find alternatives
6. CRITICAL DESCRIPTION REQUIREMENT:
   - For each video/blog/book, provide a "description" field that explains:
     * What specific topics/concepts this resource teaches (related to the subtopic's topics)
     * What the user will learn from this resource
     * How it relates to the subtopic's topics
   - Example: "description": "This video covers the fundamentals of discrete-time signals, sampling theorem, and aliasing. Perfect for understanding how analog signals are converted to digital format."
   - Make descriptions specific and informative - explain what the user will learn about the actual subject matter
7. Include 2-3 videos, 2-3 blogs, and 1-2 books per subtopic when available from SUBTOPIC-SPECIFIC RESOURCES, but ONLY if they match that subtopic's topics.
8. List specific topics/concepts to study in the "topics" array for each subtopic (use the topics from SUBTOPIC OUTLINE).
9. TeachingStyle should reflect the user's preference (visual, hands-on, theoretical, practical, project-based, video-based, reading-based, or mixed).

IMPORTANT: When assigning resources to subtopics:
- Look at the "=== SUBTOPIC-SPECIFIC RESOURCES ===" section above
- Match each subtopic to its corresponding resources section by name
- Use ONLY resources from that subtopic's section
- Extract URLs EXACTLY as shown (copy verbatim from VERIFIED CITATIONS)
- Create meaningful descriptions that explain what each resource teaches about the actual subject matter
- Do NOT use generic "how to learn" resources - use resources about the actual topics (e.g., "Linear Regression Tutorial" not "How to Learn Faster")
- Each subtopic's resources should be unique and relevant to that subtopic's specific topics
- NEVER leave videos, blogs, or books arrays empty - always try to find relevant resources from SUBTOPIC-SPECIFIC RESOURCES

EXAMPLE of proper resource format:
"videos": [
  {{
    "title": "Introduction to Digital Signal Processing",
    "url": "https://www.youtube.com/watch?v=example123",
    "description": "This comprehensive video tutorial covers the basics of DSP including discrete-time signals, sampling theorem, and quantization. Perfect for beginners starting with Subtopic1 topics."
  }}
]

Output ONLY the JSON object, nothing else."""),
            MessagesPlaceholder(variable_name="messages")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({"messages": messages})
        
        roadmap_text = response.content.strip()
        
        # Check if response is empty
        if not roadmap_text:
            actions.append({"type": "error", "message": "LLM returned empty response"})
            return {
                **state,
                "final_roadmap": "",
                "actions": actions,
                "messages": messages + [AIMessage(content="Failed to generate roadmap: empty response from AI. Please try again.")]
            }
        
        # Extract JSON from response (remove markdown code blocks if present)
        roadmap_json_str = self._extract_json_from_response(roadmap_text)
        
        # Check if extracted JSON is empty
        if not roadmap_json_str or roadmap_json_str.strip() == "":
            actions.append({"type": "error", "message": f"Failed to extract JSON from response. Raw response length: {len(roadmap_text)}"})
            # Return the text as-is for debugging
            return {
                **state,
                "final_roadmap": roadmap_text,
                "actions": actions,
                "messages": messages + [AIMessage(content=f"Roadmap generated but JSON extraction failed. Raw content:\n\n{roadmap_text[:1000]}")]
            }
        
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
    
    def _generate_subtopic_outline(self, user_input: str, roadmap_context: str, user_context: str, teaching_style: str) -> str:
        """Generate a subtopic outline first before searching for resources"""
        context_text = ""
        if roadmap_context:
            context_text += f"Original roadmap document:\n{roadmap_context}\n\n"
        context_text += f"User requirements:\n{user_context}\n\n"
        context_text += f"Teaching style: {teaching_style}"
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are an expert at breaking down learning topics into logical subtopics.

{context_text}

Your task is to create a structured outline of subtopics for this learning path. Output ONLY a structured text format like this:

SUBTopic1: [Name of Subtopic]
Topics: [topic1, topic2, topic3, ...]

SUBTopic2: [Name of Subtopic]
Topics: [topic1, topic2, topic3, ...]

SUBTopic3: [Name of Subtopic]
Topics: [topic1, topic2, topic3, ...]

Requirements:
1. Break the learning path into 4-6 logical subtopics
2. Each subtopic should have a clear, descriptive name
3. List 4-6 specific topics/concepts that will be covered in each subtopic
4. Order subtopics logically (foundations first, then building up)
5. Make sure topics are specific to the subject matter (e.g., "Fourier Transform", "AM Modulation", not generic learning skills)

Output ONLY the outline, nothing else."""),
            MessagesPlaceholder(variable_name="messages")
        ])
        
        # Use a minimal message list for outline generation
        outline_messages = [HumanMessage(content=user_input)]
        
        chain = prompt | self.llm
        response = chain.invoke({"messages": outline_messages})
        
        return response.content.strip()
    
    def _extract_subtopics_from_outline(self, outline: str) -> dict:
        """Extract subtopic names and their topics from the outline"""
        subtopics = {}
        
        if not outline:
            return subtopics
        
        # Parse the outline format:
        # SUBTopic1: [Name]
        # Topics: [topic1, topic2, ...]
        
        lines = outline.split('\n')
        current_subtopic = None
        current_topics = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this is a subtopic header
            if line.upper().startswith('SUBTOPIC') or (':' in line and not line.startswith('Topics:')):
                # Save previous subtopic if exists
                if current_subtopic and current_topics:
                    subtopics[current_subtopic] = current_topics
                
                # Extract subtopic name
                if ':' in line:
                    current_subtopic = line.split(':', 1)[1].strip()
                    # Remove brackets if present
                    current_subtopic = current_subtopic.strip('[]')
                    current_topics = []
            
            # Check if this is a topics line
            elif line.lower().startswith('topics:'):
                topics_str = line.split(':', 1)[1].strip()
                # Parse topics (could be comma-separated or in brackets)
                topics_str = topics_str.strip('[]')
                # Split by comma and clean up
                topics = [t.strip().strip('"\'') for t in topics_str.split(',')]
                current_topics = [t for t in topics if t]
        
        # Save last subtopic
        if current_subtopic and current_topics:
            subtopics[current_subtopic] = current_topics
        
        # Fallback: if parsing failed, try to extract any subtopic-like patterns
        if not subtopics:
            # Try to find numbered subtopics
            pattern = r'(?:SUBTopic|Subtopic|Topic)\s*\d+[:\-]\s*(.+?)(?=\n(?:SUBTopic|Subtopic|Topic)\s*\d+[:\-]|\nTopics:|$)'
            matches = re.findall(pattern, outline, re.IGNORECASE | re.MULTILINE)
            if matches:
                for i, match in enumerate(matches[:6], 1):  # Limit to 6 subtopics
                    subtopics[f"Subtopic {i}"] = []
        
        return subtopics
    
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
            return "normal"
        
        text_lower = user_context.lower()
        
        teaching_styles = {
            "fast-paced": ["fast-paced", "fast paced", "quick", "quick learn", "quick learn"],
            "in-depth": ["in-depth", "deep", "thorough", "thorough learning", "thorough learning"],
            "normal": ["normal", "regular", "standard", "regular learning", "regular learning"],
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
            "final_roadmap": "",
            "waiting_for_response": False
        }
        
        final_state = self.graph.invoke(initial_state)
        return final_state

