"""
Streamlit Frontend for Roadmap Generator Agent
"""

import streamlit as st
import os
import re
import tempfile
import json
from backend.agents import RoadmapGeneratorAgent
from langchain_core.messages import HumanMessage, AIMessage
import time


def render():
    """Render the roadmap generator page"""
    # Initialize session state
    if "agent" not in st.session_state:
        try:
            st.session_state.agent = RoadmapGeneratorAgent()
        except Exception as e:
            st.error(f"Failed to initialize agent: {str(e)}")
            st.stop()
    
    if "conversation" not in st.session_state:
        st.session_state.conversation = []
    
    if "file_uploaded" not in st.session_state:
        st.session_state.file_uploaded = None
    
    if "ocr_text" not in st.session_state:
        st.session_state.ocr_text = ""
    
    if "processing" not in st.session_state:
        st.session_state.processing = False
    
    if "actions" not in st.session_state:
        st.session_state.actions = []
    
    if "clarification_count" not in st.session_state:
        st.session_state.clarification_count = 0
    
    if "roadmap_context" not in st.session_state:
        st.session_state.roadmap_context = ""
    
    if "latest_roadmap" not in st.session_state:
        st.session_state.latest_roadmap = ""
    
    if "roadmap_json" not in st.session_state:
        st.session_state.roadmap_json = None
    
    
        def display_action(action):
        """Display an action with appropriate icon and styling"""
        action_type = action.get("type", "info")
        message = action.get("message", "")
        
        if action_type == "ocr":
            st.info(f"🔍 {message}")
        elif action_type == "search":
            st.info(f"🌐 {message}")
        elif action_type == "scraping":
            st.info(f"📚 {message}")
        elif action_type == "generating":
            st.info(f"✨ {message}")
        elif action_type == "thinking":
            st.info(f"🤔 {message}")
        elif action_type == "clarification":
            st.warning(f"❓ {message}")
        elif action_type == "success":
            st.success(f"✅ {message}")
        elif action_type == "error":
            st.error(f"❌ {message}")
        else:
            st.info(f"ℹ️ {message}")
    
    
        def is_json(text: str) -> bool:
        """Check if text is valid JSON"""
        try:
            json.loads(text)
            return True
        except:
            return False
    
    
        def render_roadmap_flowchart(json_data: dict):
        """Render the roadmap as a beautiful flowchart"""
        if not json_data:
            return
        
        teaching_style = json_data.get("TeachingStyle", "mixed")
        
        # Display teaching style prominently
        st.markdown("### 🎯 Teaching Style")
        style_colors = {
            "visual": "🔵",
            "hands-on": "🟢",
            "theoretical": "🟣",
            "video-based": "🔴",
            "reading-based": "🟠",
            "project-based": "🟡",
            "mixed": "🌈"
        }
        style_icon = style_colors.get(teaching_style.lower(), "🌈")
        st.markdown(f"**{style_icon} {teaching_style.title()}**")
        st.markdown("---")
        
        # Get all subtopics
        subtopics = {k: v for k, v in json_data.items() if k.startswith("Subtopic")}
        
        if not subtopics:
            st.warning("No subtopics found in roadmap")
            return
        
        # Sort subtopics by key (Subtopic1, Subtopic2, etc.)
        def get_subtopic_number(key):
            match = re.search(r'\d+', key)
            return int(match.group()) if match else 999
        
        sorted_subtopics = sorted(subtopics.items(), key=lambda x: get_subtopic_number(x[0]))
        
        # Create flowchart visualization
        st.markdown("### 📊 Learning Path Flowchart")
        
        for idx, (subtopic_key, subtopic_data) in enumerate(sorted_subtopics):
            topic_name = subtopic_data.get("TopicName", subtopic_key)
            time_to_complete = subtopic_data.get("SuggestedTimeToComplete", "Not specified")
            content_list = subtopic_data.get("ContentList", {})
            
            # Create a card for each subtopic
            with st.container():
                # Subtopic header with arrow indicator
                if idx > 0:
                    st.markdown("<div style='text-align: center; margin: 10px 0;'><span style='font-size: 24px;'>⬇️</span></div>", unsafe_allow_html=True)
                
                # Subtopic card
                st.markdown(f"""
                <div style='border: 2px solid #4CAF50; border-radius: 10px; padding: 20px; margin: 15px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;'>
                    <h3 style='margin: 0; color: white;'>📚 {topic_name}</h3>
                    <p style='margin: 5px 0; opacity: 0.9;'>⏱️ Estimated Time: {time_to_complete}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # Content list in expandable sections
                with st.expander(f"📖 View Resources for {topic_name}", expanded=False):
                    # Videos
                    videos = content_list.get("videos", [])
                    if videos:
                        st.markdown("#### 🎥 Videos")
                        for video in videos:
                            title = video.get("title", "Untitled")
                            url = video.get("url", "")
                            description = video.get("description", "")
                            if url:
                                st.markdown(f"- [{title}]({url})")
                                if description:
                                    st.caption(description)
                            else:
                                st.markdown(f"- {title}")
                                if description:
                                    st.caption(description)
                        st.markdown("---")
                    
                    # Blogs
                    blogs = content_list.get("blogs", [])
                    if blogs:
                        st.markdown("#### 📝 Blogs & Articles")
                        for blog in blogs:
                            title = blog.get("title", "Untitled")
                            url = blog.get("url", "")
                            description = blog.get("description", "")
                            if url:
                                st.markdown(f"- [{title}]({url})")
                                if description:
                                    st.caption(description)
                            else:
                                st.markdown(f"- {title}")
                                if description:
                                    st.caption(description)
                        st.markdown("---")
                    
                    # Books
                    books = content_list.get("books", [])
                    if books:
                        st.markdown("#### 📚 Books")
                        for book in books:
                            title = book.get("title", "Untitled")
                            author = book.get("author", "")
                            description = book.get("description", "")
                            book_display = f"**{title}**"
                            if author:
                                book_display += f" by {author}"
                            st.markdown(f"- {book_display}")
                            if description:
                                st.caption(description)
                        st.markdown("---")
                    
                    # Topics to study
                    topics = content_list.get("topics", [])
                    if topics:
                        st.markdown("#### 🎯 Topics to Study")
                        for topic in topics:
                            st.markdown(f"- {topic}")
        
        # Add download JSON button
        st.markdown("---")
        json_str = json.dumps(json_data, indent=2)
        st.download_button(
            label="📥 Download Roadmap as JSON",
            data=json_str,
            file_name="roadmap.json",
            mime="application/json"
        )
    
    
        def render_roadmap(markdown_text: str):
        """Render the roadmap in a visually structured format"""
        if not markdown_text:
            return
        
        # Check if it's JSON
        if is_json(markdown_text):
            try:
                json_data = json.loads(markdown_text)
                render_roadmap_flowchart(json_data)
                return
            except:
                pass
        
        # Otherwise render as markdown (backward compatibility)
        # Primary summary (up to first stage heading)
        sections = re.split(r"\n(?=## )", markdown_text.strip())
        summary = sections[0]
    
        st.markdown("### 🧭 Roadmap Overview")
        st.markdown(summary)
    
        for section in sections[1:]:
            section = section.strip()
            if not section:
                continue
            lines = section.split("\n", 1)
            title = lines[0].replace("##", "").strip()
            content = lines[1] if len(lines) > 1 else ""
            with st.container():
                st.markdown(f"#### {title}")
                st.markdown(content)
    
    
        def process_roadmap_request(user_input, file_path=None, ocr_text=None, conversation_history=None):
        """Process the roadmap generation request"""
        try:
            # Build initial state with conversation history
            initial_state = {
                "messages": conversation_history or [HumanMessage(content=user_input)],
                "clarification_count": st.session_state.get("clarification_count", 0),
                "user_input": user_input,
                "file_path": file_path,
                "ocr_text": ocr_text or "",
                "roadmap_context": st.session_state.get("roadmap_context", ""),
                "actions": [],
                "final_roadmap": "",
                "waiting_for_response": False  # Reset waiting flag when user responds
            }
            
            # Run the agent graph
            result = st.session_state.agent.graph.invoke(initial_state)
            
            # Update session state
            if "roadmap_context" in result:
                st.session_state.roadmap_context = result.get("roadmap_context", "")
            if "clarification_count" in result:
                st.session_state.clarification_count = result.get("clarification_count", 0)
            if "final_roadmap" in result:
                roadmap_text = result.get("final_roadmap", "")
                st.session_state.latest_roadmap = roadmap_text
                # Try to parse as JSON
                if is_json(roadmap_text):
                    try:
                        st.session_state.roadmap_json = json.loads(roadmap_text)
                    except:
                        st.session_state.roadmap_json = None
                else:
                    st.session_state.roadmap_json = None
            
            return result
        except Exception as e:
            st.error(f"Error processing request: {str(e)}")
            import traceback
            st.error(traceback.format_exc())
            return None
    
    
    # Main UI
    st.title("🗺️ Roadmap Generator Agent")
    st.markdown("Generate comprehensive learning roadmaps with AI assistance")
    
    # Sidebar for file upload
    with st.sidebar:
        st.header("📁 Upload Roadmap Document")
        st.markdown("Upload an image or PDF of an existing roadmap to extract and enhance it")
        
        uploaded_file = st.file_uploader(
            "Choose a file",
            type=["png", "jpg", "jpeg", "pdf"],
            help="Upload an image or PDF containing a roadmap"
        )
        
        if uploaded_file is not None:
            # Save uploaded file temporarily
            file_ext = uploaded_file.name.split(".")[-1] if "." in uploaded_file.name else "pdf"
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp_file:
                tmp_file.write(uploaded_file.read())
                st.session_state.file_uploaded = tmp_file.name
                st.success(f"File uploaded: {uploaded_file.name}")
            st.session_state.ocr_text = ""
        
    st.markdown("---")
    st.markdown("### How it works:")
    st.markdown("""
        1. **Type 1**: Enter what you want to learn (e.g., "I want to learn machine learning")
        2. **Type 2**: Upload a roadmap image/PDF and describe what you need
        
        The agent will:
        - Extract text from uploaded files (OCR)
        - Ask clarification questions (max 3)
        - Search the web for latest resources
        - Scrape trusted sources (MIT OCW, etc.)
        - Generate a comprehensive roadmap
        """)
    
        # Main content area
        col1, col2 = st.columns([2, 1])
    
        with col1:
        # Roadmap display
        if st.session_state.latest_roadmap:
            st.header("📍 Current Roadmap")
            render_roadmap(st.session_state.latest_roadmap)
            st.markdown("---")
    
        # Chat interface
        st.header("💬 Conversation")
        
        # Display conversation history
        chat_container = st.container()
        with chat_container:
            for msg in st.session_state.conversation:
                if msg["role"] == "user":
                    with st.chat_message("user"):
                        st.write(msg["content"])
                elif msg["role"] == "assistant":
                    with st.chat_message("assistant"):
                        st.markdown(msg["content"])
        
        # Display actions
        if st.session_state.actions:
            st.markdown("### 🔄 Agent Actions")
            for action in st.session_state.actions:
                display_action(action)
        
        # Input area
        user_input = st.chat_input("Enter what you want to learn or describe your roadmap needs...")
        
        if user_input:
            # Add user message to conversation
            st.session_state.conversation.append({
                "role": "user",
                "content": user_input
            })
            
            # Process the request
            with st.spinner("Processing your request..."):
                st.session_state.processing = True
                
                # Get file path if file was uploaded
                file_path = st.session_state.file_uploaded if st.session_state.file_uploaded else None
                ocr_text = st.session_state.ocr_text if st.session_state.ocr_text else None
                
                # Build conversation history for agent
                conversation_history = []
                for conv in st.session_state.conversation:
                    if conv["role"] == "user":
                        conversation_history.append(HumanMessage(content=conv["content"]))
                    elif conv["role"] == "assistant":
                        conversation_history.append(AIMessage(content=conv["content"]))
                
                # Process request
                result = process_roadmap_request(
                    user_input=user_input,
                    file_path=file_path,
                    ocr_text=ocr_text,
                    conversation_history=conversation_history
                )
                
                if result:
                    # Update actions
                    new_actions = result.get("actions", [])
                    st.session_state.actions.extend(new_actions)
                    
                    # Extract new messages
                    messages = result.get("messages", [])
                    existing_contents = {m["content"] for m in st.session_state.conversation if m["role"] == "assistant"}
                    
                    for msg in messages:
                        if isinstance(msg, AIMessage) and msg.content:
                            # Check if this is a new message
                            if msg.content not in existing_contents:
                                st.session_state.conversation.append({
                                    "role": "assistant",
                                    "content": msg.content
                                })
                                existing_contents.add(msg.content)
                    
                    # Update OCR text if extracted
                    if result.get("ocr_text"):
                        st.session_state.ocr_text = result.get("ocr_text", "")
                    
                    # Clear file after processing (only if roadmap was generated)
                    if result.get("final_roadmap") and file_path:
                        try:
                            os.unlink(file_path)
                            st.session_state.file_uploaded = None
                        except:
                            pass
                
                st.session_state.processing = False
                st.rerun()
    
        with col2:
        st.header("📊 Status")
        
        if st.session_state.processing:
            st.info("🔄 Processing...")
        else:
            st.success("✅ Ready")
        
    st.markdown("---")
        
        # Display current state
        if st.session_state.file_uploaded:
            st.info(f"📁 File ready: {os.path.basename(st.session_state.file_uploaded)}")
        
        if st.session_state.ocr_text:
            with st.expander("📄 Extracted OCR Text"):
                st.text(st.session_state.ocr_text[:500] + "..." if len(st.session_state.ocr_text) > 500 else st.session_state.ocr_text)
        
        # Display JSON viewer if available
        if st.session_state.roadmap_json:
            with st.expander("📋 View Raw JSON"):
                st.json(st.session_state.roadmap_json)
        
        # Clear conversation button
        if st.button("🗑️ Clear Conversation"):
            st.session_state.conversation = []
            st.session_state.actions = []
            st.session_state.file_uploaded = None
            st.session_state.ocr_text = ""
            st.session_state.clarification_count = 0
            st.session_state.roadmap_context = ""
            st.session_state.latest_roadmap = ""
            st.session_state.roadmap_json = None
            st.rerun()
    
        # Footer
    st.markdown("---")
    st.markdown("""
        ### 🔧 Environment Variables Required:
        - `GOOGLE_API_KEY`: For all Gemini-powered reasoning, OCR, and generation
        - `PERPLEXITY_API_KEY`: For web search with verified citations
        """)
    
