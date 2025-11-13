"""
Content Creator Agent using LangGraph
Generates stepwise educational content for each subtopic
"""
from typing import TypedDict, Annotated, List, Dict, Literal, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import json
import os
from datetime import datetime
from .content_context import ContextManager, SubtopicContext
from .content_tools import LaTeXGenerator, GraphGenerator, ContentFormatter
from .quiz_generator import QuizGenerator
from .graph_generator import GraphGeneratorAgent
from .content_research import ContentResearchTool


class ContentAgentState(TypedDict):
    """State for content creator agent"""
    messages: Annotated[list, lambda x, y: x + y]
    roadmap_json: dict
    teaching_style: str
    current_subtopic_id: str
    current_subtopic_data: dict
    researched_content: Dict  # Research results from trusted sources
    topic_resources: Dict  # Videos and articles for each topic
    generated_content: str
    generated_graphs: List[Dict]  # {type, code, description}
    generated_quiz: list
    context_manager: ContextManager
    actions: Annotated[list, lambda x, y: x + y]
    content_complete: bool


class ContentCreatorAgent:
    """Main content creator agent"""
    
    def __init__(self, model_name: str = "gemini-2.5-flash", temperature: float = 0.7):
        # Use gemini-2.5-flash for fast and efficient content generation
        self.llm = ChatGoogleGenerativeAI(
            model=model_name, 
            temperature=temperature
        )
        self.context_manager = ContextManager()
        self.quiz_generator = QuizGenerator(self.llm, self.context_manager)
        self.graph_generator_agent = GraphGeneratorAgent(self.llm)
        self.latex_generator = LaTeXGenerator()
        self.content_formatter = ContentFormatter()
        self.graph_generator = GraphGenerator()
        self.research_tool = ContentResearchTool()
        self.graph = self._build_graph()
    
    def _build_graph(self):
        """Build LangGraph workflow"""
        workflow = StateGraph(ContentAgentState)
        
        workflow.add_node("load_roadmap", self.load_roadmap)
        workflow.add_node("load_context", self.load_context)
        workflow.add_node("research_content", self.research_content)
        workflow.add_node("generate_content", self.generate_content)
        workflow.add_node("generate_graphs", self.generate_graphs)
        workflow.add_node("generate_quiz", self.generate_quiz)
        workflow.add_node("save_context", self.save_context)
        
        workflow.set_entry_point("load_roadmap")
        workflow.add_edge("load_roadmap", "load_context")
        workflow.add_edge("load_context", "research_content")
        workflow.add_edge("research_content", "generate_content")
        workflow.add_edge("generate_content", "generate_graphs")
        workflow.add_edge("generate_graphs", "generate_quiz")
        workflow.add_edge("generate_quiz", "save_context")
        workflow.add_edge("save_context", END)
        
        return workflow.compile()
    
    def load_roadmap(self, state: ContentAgentState) -> ContentAgentState:
        """Load roadmap JSON and determine current subtopic"""
        roadmap_json = state.get("roadmap_json")
        actions = state.get("actions", [])
        
        if not roadmap_json:
            return {
                **state,
                "actions": actions + [{"type": "error", "message": "No roadmap provided"}],
                "content_complete": True
            }
        
        # Store roadmap in context manager
        self.context_manager.set_roadmap(roadmap_json)
        
        # Extract teaching style
        teaching_style = roadmap_json.get("TeachingStyle", "normal")
        self.context_manager.set_teaching_style(teaching_style)
        
        # Determine current subtopic (first incomplete one)
        completed_ids = self.context_manager.get_completed_subtopic_ids()
        all_subtopics = [k for k in roadmap_json.keys() if k.startswith("Subtopic")]
        current_subtopic = None
        
        for subtopic_id in sorted(all_subtopics, key=lambda x: int(x.replace("Subtopic", ""))):
            if subtopic_id not in completed_ids:
                current_subtopic = subtopic_id
                break
        
        if not current_subtopic:
            return {
                **state,
                "content_complete": True,
                "actions": actions + [{"type": "info", "message": "All subtopics completed!"}]
            }
        
        current_subtopic_data = roadmap_json.get(current_subtopic, {})
        
        return {
            **state,
            "teaching_style": teaching_style,
            "current_subtopic_id": current_subtopic,
            "current_subtopic_data": current_subtopic_data,
            "actions": actions + [{"type": "info", "message": f"Loading roadmap, current subtopic: {current_subtopic}"}]
        }
    
    def load_context(self, state: ContentAgentState) -> ContentAgentState:
        """Load context from previous subtopics"""
        actions = state.get("actions", [])
        context_summary = self.context_manager.get_context_summary()
        
        return {
            **state,
            "context_manager": self.context_manager,
            "actions": actions + [{"type": "info", "message": "Context loaded from previous subtopics"}]
        }
    
    def research_content(self, state: ContentAgentState) -> ContentAgentState:
        """Research content from trusted sources and find topic-specific resources"""
        subtopic_data = state.get("current_subtopic_data", {})
        actions = state.get("actions", [])
        
        topic_name = subtopic_data.get("TopicName", "")
        topics = subtopic_data.get("ContentList", {}).get("topics", [])
        
        actions.append({"type": "info", "message": f"Researching content for {topic_name}..."})
        
        # Research subtopic from all sources
        try:
            research_results = self.research_tool.research_subtopic(topic_name, topics)
            
            actions.append({"type": "success", "message": "Content research completed"})
            actions.append({"type": "info", "message": f"Found resources for {len(topics)} topics"})
            
            # Count resources found
            total_videos = sum(len(r.get("videos", [])) for r in research_results.get("topic_resources", {}).values())
            total_articles = sum(len(r.get("articles", [])) for r in research_results.get("topic_resources", {}).values())
            actions.append({"type": "info", "message": f"Found {total_videos} videos and {total_articles} articles"})
            
            return {
                **state,
                "researched_content": research_results,
                "topic_resources": research_results.get("topic_resources", {}),
                "actions": actions
            }
        except Exception as e:
            actions.append({"type": "error", "message": f"Research failed: {str(e)}"})
            return {
                **state,
                "researched_content": {},
                "topic_resources": {},
                "actions": actions
            }
    
    def generate_content(self, state: ContentAgentState) -> ContentAgentState:
        """Generate content for current subtopic"""
        subtopic_data = state.get("current_subtopic_data", {})
        teaching_style = state.get("teaching_style", "normal")
        context_summary = self.context_manager.get_context_summary()
        actions = state.get("actions", [])
        researched_content = state.get("researched_content", {})
        topic_resources = state.get("topic_resources", {})
        
        topic_name = subtopic_data.get("TopicName", "")
        topics = subtopic_data.get("ContentList", {}).get("topics", [])
        resources = subtopic_data.get("ContentList", {})
        time_to_complete = subtopic_data.get("SuggestedTimeToComplete", "")
        
        # Build teaching style instructions
        style_instructions = self._get_teaching_style_instructions(teaching_style)
        
        # Build resource information from roadmap
        videos = resources.get("videos", [])
        blogs = resources.get("blogs", [])
        books = resources.get("books", [])
        
        resources_text = f"""
Available Resources from Roadmap:
- Videos: {len(videos)} videos
- Blogs/Articles: {len(blogs)} articles  
- Books: {len(books)} books
"""
        
        # Build researched content context
        trusted_sources = researched_content.get("trusted_sources", "")
        tavily_content = researched_content.get("tavily_content", "")
        
        research_context = ""
        if trusted_sources:
            research_context += f"\n\n=== TRUSTED SOURCES CONTENT ===\n{trusted_sources[:2000]}\n"
        if tavily_content:
            research_context += f"\n\n=== TAVILY SEARCH RESULTS ===\n{tavily_content[:1500]}\n"
        
        # Format topic-specific resources
        topic_resources_text = self.research_tool.format_resources_for_content(topic_resources)
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=f"""You are an expert educational content creator. Generate EXTENSIVE, comprehensive, in-depth content for teaching a subtopic.

CRITICAL: You MUST generate COMPLETE, FULL content covering EVERY topic listed. DO NOT stop mid-sentence or truncate. Generate comprehensive educational material.

TEACHING STYLE: {teaching_style}
{style_instructions}

PREVIOUS SUBTOPICS CONTEXT:
{context_summary}

{research_context}

COMPREHENSIVE CONTENT REQUIREMENTS:
1. Generate EXTENSIVE content covering ALL topics listed below - be thorough and complete
2. For EACH topic, provide:
   - Detailed theoretical explanation
   - Mathematical derivations with LaTeX equations ($$...$$ for display, $...$ for inline)
   - At least 2-3 SOLVED EXAMPLES with step-by-step solutions
   - Practical applications and real-world use cases
   - Visual descriptions (graphs/charts will be added later)
3. Include solved examples for EVERY mathematical concept - show complete step-by-step solutions
4. Reference previous subtopics when building on concepts (use context above)
5. Make content engaging and appropriate for the teaching style
6. Structure content with clear headings:
   - ## for main topic sections
   - ### for subtopics within each topic
   - #### for subsections
7. For each topic section, include:
   - Introduction to the concept
   - Theoretical foundation
   - Mathematical formulation (with LaTeX)
   - Solved examples (minimum 2-3 per topic)
   - Applications and examples
   - Summary and key takeaways
8. CRITICAL: Include links to relevant videos and articles from the topic_resources section below
9. Integrate information from trusted sources (MIT OCW, etc.) naturally into the content
10. Cite sources appropriately when using information from researched content
11. Use markdown formatting throughout
12. DO NOT truncate or stop mid-sentence - generate complete, full content

Content Structure (for each topic):
## [Topic Name]
### Introduction
[Explain what this topic is and why it's important]

### Theoretical Foundation
[Detailed explanation with LaTeX equations]

### Mathematical Formulation
[Equations and derivations with LaTeX]

### Solved Examples
**Example 1:** [Problem statement]
**Solution:**
Step 1: [Detailed step]
Step 2: [Detailed step]
...
**Answer:** [Final answer]

**Example 2:** [Another problem]
[Complete solution]

### Applications
[Real-world applications]

### Additional Resources
[Links to videos and articles from topic_resources]

### Summary
[Key takeaways]

Output the COMPLETE, FULL content in Markdown format. DO NOT truncate. Generate comprehensive educational material covering all topics thoroughly."""),
            HumanMessage(content=f"""Generate EXTENSIVE, comprehensive educational content for:

Subtopic: {topic_name}
Estimated Time: {time_to_complete}

Topics to cover (MUST cover ALL of these thoroughly):
{chr(10).join(f"- {t}" for t in topics)}

{resources_text}

{topic_resources_text}

CRITICAL INSTRUCTIONS:
- Generate COMPLETE, FULL content for EACH topic listed above
- Include at least 2-3 solved examples per topic with step-by-step solutions
- Use LaTeX equations extensively for all mathematical content
- Include links to videos and articles from the resources above
- Integrate information from trusted sources naturally
- DO NOT truncate or stop mid-sentence
- Generate comprehensive, extensive educational material

Generate the complete content now.""")
        ])
        
        chain = prompt | self.llm
        
        # Generate content with retry logic for completeness
        max_retries = 3
        content = ""
        for attempt in range(max_retries):
            try:
                actions.append({"type": "info", "message": f"Generating content (attempt {attempt + 1}/{max_retries})..."})
                
                # Invoke with streaming to get full response
                response = chain.invoke({})
                content = response.content if hasattr(response, 'content') else str(response)
                
                # Ensure we got content
                if not content:
                    raise ValueError("Empty response from LLM")
                
                # Check if content seems complete
                if content and len(content) > 500:
                    # Verify all topics are mentioned
                    topics_covered = sum(1 for topic in topics if any(word.lower() in content.lower() for word in topic.split()[:3]))
                    
                    # Check if content ends properly (not mid-sentence)
                    ends_properly = content.strip().endswith(('.', '!', '?', '```', '**', '##', '###'))
                    
                    if topics_covered >= len(topics) * 0.7 and (ends_properly or len(content) > 5000):
                        actions.append({"type": "success", "message": f"Content generation complete ({topics_covered}/{len(topics)} topics covered)"})
                        break
                    elif attempt < max_retries - 1:
                        actions.append({"type": "warning", "message": f"Content may be incomplete ({topics_covered}/{len(topics)} topics), retrying..."})
                        # Add instruction to continue from where it left off
                        continue
                    else:
                        actions.append({"type": "warning", "message": f"Content generated but may not cover all topics ({topics_covered}/{len(topics)})"})
                        break
                else:
                    if attempt < max_retries - 1:
                        actions.append({"type": "warning", "message": f"Content too short ({len(content)} chars), retrying..."})
                        continue
                    else:
                        raise ValueError(f"Content too short after {max_retries} attempts")
                
            except Exception as e:
                error_msg = str(e)
                if attempt < max_retries - 1:
                    actions.append({"type": "warning", "message": f"Generation error, retrying... (attempt {attempt + 1}): {error_msg[:100]}"})
                    continue
                else:
                    actions.append({"type": "error", "message": f"Failed to generate content after {max_retries} attempts: {error_msg}"})
                    raise
        
        if not content:
            raise ValueError("Failed to generate content after retries")
        
        # Validate content completeness
        content_length = len(content)
        if content_length < 2000:
            actions.append({"type": "warning", "message": f"Generated content seems short ({content_length} chars). Expected comprehensive content."})
        
        # Extract equations
        equations = self.latex_generator.extract_equations_from_text(content)
        
        # Count solved examples
        example_count = content.lower().count("example") + content.lower().count("solved")
        
        # Count sections
        section_count = content.count("##")
        
        return {
            **state,
            "generated_content": content,
            "actions": actions + [
                {"type": "success", "message": f"Content generated for {topic_name} ({content_length:,} characters)"},
                {"type": "info", "message": f"Found {len(equations)} equations, {example_count} examples, and {section_count} sections"}
            ]
        }
    
    def generate_graphs(self, state: ContentAgentState) -> ContentAgentState:
        """Generate graphs for content using sub-agent"""
        content = state.get("generated_content", "")
        actions = state.get("actions", [])
        
        if not content:
            return {
                **state,
                "generated_graphs": [],
                "actions": actions + [{"type": "warning", "message": "No content to generate graphs for"}]
            }
        
        actions.append({"type": "info", "message": "Analyzing content for graph requirements..."})
        
        # Use graph generator sub-agent
        graphs = self.graph_generator_agent.generate_graphs_for_content(content)
        
        # Integrate graphs into content
        if graphs:
            # Insert graph code blocks into content at appropriate locations
            content_with_graphs = content
            for i, graph in enumerate(graphs):
                graph_code = graph.get("code", "")
                if graph_code:
                    # Insert graph after relevant sections
                    content_with_graphs = self.content_formatter.insert_graph_code(
                        content_with_graphs, graph_code, position="end"
                    )
            
            return {
                **state,
                "generated_content": content_with_graphs,
                "generated_graphs": graphs,
                "actions": actions + [
                    {"type": "success", "message": f"Generated {len(graphs)} graphs"}
                ]
            }
        
        return {
            **state,
            "generated_graphs": [],
            "actions": actions + [{"type": "info", "message": "No graphs needed for this content"}]
        }
    
    def generate_quiz(self, state: ContentAgentState) -> ContentAgentState:
        """Generate quiz for current subtopic using sub-agent"""
        content = state.get("generated_content", "")
        subtopic_name = state.get("current_subtopic_data", {}).get("TopicName", "")
        subtopic_id = state.get("current_subtopic_id", "")
        actions = state.get("actions", [])
        
        if not content:
            return {
                **state,
                "generated_quiz": [],
                "actions": actions + [{"type": "warning", "message": "No content to generate quiz for"}]
            }
        
        actions.append({"type": "info", "message": "Generating quiz questions..."})
        
        # Use quiz generator sub-agent
        try:
            quiz_result = self.quiz_generator.generate_subtopic_quiz(
                content, subtopic_name, subtopic_id, num_questions=5
            )
            
            quiz_questions = quiz_result.get("questions", [])
            
            if not quiz_questions:
                actions.append({
                    "type": "warning", 
                    "message": "Quiz generation returned 0 questions. Check console for details."
                })
            
            return {
                **state,
                "generated_quiz": quiz_questions,
                "actions": actions + [
                    {"type": "success", "message": f"Generated {len(quiz_questions)} quiz questions"}
                ]
            }
        except Exception as e:
            import traceback
            print(f"Quiz generation error: {traceback.format_exc()}")
            actions.append({
                "type": "error",
                "message": f"Quiz generation error: {str(e)}"
            })
            return {
                **state,
                "generated_quiz": [],
                "actions": actions
            }
    
    def save_context(self, state: ContentAgentState) -> ContentAgentState:
        """Save context for completed subtopic"""
        subtopic_id = state.get("current_subtopic_id")
        subtopic_data = state.get("current_subtopic_data", {})
        content = state.get("generated_content", "")
        quiz = state.get("generated_quiz", [])
        actions = state.get("actions", [])
        
        # Extract key information
        equations = self.latex_generator.extract_equations_from_text(content)
        topics = subtopic_data.get("ContentList", {}).get("topics", [])
        
        # Create summary (first 500 chars)
        summary = content[:500] + "..." if len(content) > 500 else content
        
        # Extract terminology (can be enhanced)
        terminology = []
        
        subtopic_context = SubtopicContext(
            subtopic_id=subtopic_id,
            topic_name=subtopic_data.get("TopicName", ""),
            summary=summary,
            key_concepts=topics,
            equations=equations,
            terminology=terminology,
            quiz_questions=quiz,
            generated_at=datetime.now().isoformat()
        )
        
        self.context_manager.add_completed_subtopic(subtopic_context)
        
        # Save content and quiz to files
        self._save_content_files(subtopic_id, content, quiz, state.get("generated_graphs", []))
        
        return {
            **state,
            "actions": actions + [
                {"type": "success", "message": "Context saved successfully"},
                {"type": "success", "message": "Content and quiz files saved"}
            ]
        }
    
    def _save_content_files(self, subtopic_id: str, content: str, quiz: List[Dict], graphs: List[Dict]):
        """Save generated content, quiz, and graphs to files"""
        # Save to backend directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(backend_dir, "generated_content")
        subtopic_dir = os.path.join(output_dir, subtopic_id)
        
        # Create directories
        os.makedirs(subtopic_dir, exist_ok=True)
        os.makedirs(os.path.join(subtopic_dir, "graphs"), exist_ok=True)
        
        # Save content
        content_file = os.path.join(subtopic_dir, "content.md")
        with open(content_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Save quiz
        quiz_file = os.path.join(subtopic_dir, "quiz.json")
        quiz_data = {
            "subtopic_id": subtopic_id,
            "questions": quiz,
            "num_questions": len(quiz)
        }
        with open(quiz_file, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, indent=2)
        
        # Save graphs
        for i, graph in enumerate(graphs):
            graph_file = os.path.join(subtopic_dir, "graphs", f"graph_{i+1}.py")
            with open(graph_file, 'w', encoding='utf-8') as f:
                f.write(graph.get("code", ""))
    
    def _get_teaching_style_instructions(self, style: str) -> str:
        """Get instructions based on teaching style"""
        styles = {
            "normal": "Use a balanced approach with theory and examples. Provide clear explanations with practical applications.",
            "fast-paced": "Be concise, focus on key concepts, use bullet points. Skip lengthy derivations, focus on essentials.",
            "in-depth": "Provide detailed explanations, derivations, and deep dives. Include mathematical proofs where relevant.",
            "visual": "Emphasize diagrams, graphs, and visual representations. Use descriptive language for visual concepts.",
            "hands-on": "Include many examples, code snippets, and practical exercises. Focus on application over theory.",
            "theoretical": "Focus on mathematical foundations, proofs, and theory. Emphasize rigorous mathematical treatment.",
            "video-based": "Structure content as if it were a video script. Use conversational tone, clear transitions.",
            "reading-based": "Use formal academic writing style. Include citations and references. Dense with information.",
            "project-based": "Organize around projects and practical applications. Show how concepts apply to real problems.",
        }
        return styles.get(style.lower(), styles["normal"])
    
    def generate_mega_quiz(self) -> Dict:
        """Generate mega quiz covering all subtopics"""
        completed_subtopics = self.context_manager.context.get("completed_subtopics", [])
        
        if not completed_subtopics:
            return {"error": "No completed subtopics to generate mega quiz from"}
        
        all_content = []
        for subtopic in completed_subtopics:
            all_content.append({
                "name": subtopic.get("topic_name", ""),
                "content": subtopic.get("summary", "")
            })
        
        mega_quiz = self.quiz_generator.generate_mega_quiz(all_content, num_questions=15)
        
        # Save mega quiz
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(backend_dir, "generated_content")
        os.makedirs(output_dir, exist_ok=True)
        mega_quiz_file = os.path.join(output_dir, "mega_quiz.json")
        with open(mega_quiz_file, 'w', encoding='utf-8') as f:
            json.dump(mega_quiz, f, indent=2)
        
        return mega_quiz

