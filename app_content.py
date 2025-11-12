"""
Streamlit UI for Content Creator Agent
"""
import streamlit as st
import json
import os
import shutil
import re
from pathlib import Path
from content_agent import ContentCreatorAgent
from content_context import ContextManager
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for Streamlit

# Page config
st.set_page_config(
    page_title="Content Creator Agent",
    page_icon="📚",
    layout="wide"
)

# Initialize session state
if "content_agent" not in st.session_state:
    try:
        st.session_state.content_agent = ContentCreatorAgent()
    except Exception as e:
        st.error(f"Failed to initialize agent: {str(e)}")
        st.stop()

if "roadmap_json" not in st.session_state:
    st.session_state.roadmap_json = None

if "generated_content" not in st.session_state:
    st.session_state.generated_content = None

if "generated_quiz" not in st.session_state:
    st.session_state.generated_quiz = None

if "current_subtopic" not in st.session_state:
    st.session_state.current_subtopic = None


def display_action(action):
    """Display an action with appropriate icon and styling"""
    action_type = action.get("type", "info")
    message = action.get("message", "")
    
    if action_type == "success":
        st.success(f"✅ {message}")
    elif action_type == "error":
        st.error(f"❌ {message}")
    elif action_type == "warning":
        st.warning(f"⚠️ {message}")
    else:
        st.info(f"ℹ️ {message}")


def render_latex_in_markdown(content: str):
    """Render markdown content with LaTeX support"""
    # Streamlit supports LaTeX natively in markdown
    # For very long content, render in chunks to avoid performance issues
    if len(content) > 100000:  # Very long content (>100k chars)
        # Split into logical chunks (by sections)
        sections = content.split('\n## ')
        if len(sections) > 1:
            # Render first section
            st.markdown('## ' + sections[0] if not sections[0].startswith('#') else sections[0])
            # Render remaining sections
            for section in sections[1:]:
                st.markdown('---')
                st.markdown('## ' + section)
        else:
            # Fallback: split by size
            chunk_size = 50000
            chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
            for i, chunk in enumerate(chunks):
                st.markdown(chunk)
                if i < len(chunks) - 1:
                    st.markdown("---")
    else:
        # Render normally for content < 100k chars
        st.markdown(content)


def execute_graph_code(code: str):
    """Execute graph code and return the figure for display"""
    try:
        import matplotlib.pyplot as plt
        import numpy as np
        
        # Create a namespace for code execution
        namespace = {
            'plt': plt,
            'np': np,
            '__builtins__': __builtins__
        }
        
        # Try to import 3D if needed
        try:
            from mpl_toolkits.mplot3d import Axes3D
            namespace['Axes3D'] = Axes3D
        except:
            pass
        
        # Clear any existing figures
        plt.clf()
        
        # Execute the code
        exec(code, namespace)
        
        # Get the current figure
        fig = plt.gcf()
        
        # Check if figure has any axes
        if len(fig.get_axes()) == 0:
            return None
        
        return fig
    except Exception as e:
        st.error(f"Error executing graph code: {str(e)}")
        import traceback
        st.code(traceback.format_exc())
        return None


def display_quiz(quiz_data):
    """Display quiz questions with reveal answer functionality"""
    if not quiz_data or not isinstance(quiz_data, list):
        st.warning("No quiz questions available")
        return
    
    st.markdown("## 📝 Quiz")
    st.markdown("---")
    
    for i, question in enumerate(quiz_data, 1):
        # Create a card-like container for each question
        with st.container():
            # Question header with difficulty badge
            difficulty = question.get('difficulty', 'unknown').upper()
            difficulty_colors = {
                'EASY': '🟢',
                'MEDIUM': '🟡',
                'HARD': '🔴'
            }
            difficulty_icon = difficulty_colors.get(difficulty, '⚪')
            
            st.markdown(f"""
            <div style='border: 2px solid #4CAF50; border-radius: 10px; padding: 20px; margin: 15px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'>
                <h3 style='color: white; margin: 0;'>Question {i} {difficulty_icon} {difficulty}</h3>
            </div>
            """, unsafe_allow_html=True)
            
            # Question text
            st.markdown(f"### {question.get('question', '')}")
            
            q_type = question.get("type", "")
            
            # Display options for multiple choice
            if q_type == "multiple_choice":
                options = question.get("options", [])
                st.markdown("**Select an option:**")
                for j, option in enumerate(options, 1):
                    st.markdown(f"**{j}.** {option}")
            
            # Reveal answer button
            answer_key = f"reveal_answer_{i}"
            if answer_key not in st.session_state:
                st.session_state[answer_key] = False
            
            if st.button(f"🔓 Reveal Answer", key=f"btn_{i}"):
                st.session_state[answer_key] = True
            
            # Show answer if revealed
            if st.session_state[answer_key]:
                st.markdown("---")
                st.markdown("### ✅ Answer")
                
                # Show correct answer
                correct_answer = question.get('correct_answer', '')
                st.success(f"**Correct Answer:** {correct_answer}")
                
                # Show explanation
                explanation = question.get('explanation', '')
                if explanation:
                    st.info(f"**Explanation:** {explanation}")
            
            st.markdown("---")


# Main UI
st.title("📚 Content Creator Agent")
st.markdown("Generate comprehensive educational content stepwise for each subtopic in your roadmap")

# Sidebar
with st.sidebar:
    st.header("📁 Upload Roadmap")
    st.markdown("Upload the roadmap JSON file generated by the Roadmap Generator Agent")
    
    uploaded_file = st.file_uploader(
        "Choose roadmap JSON file",
        type=["json"],
        help="Upload the roadmap JSON file"
    )
    
    if uploaded_file:
        try:
            roadmap_json = json.load(uploaded_file)
            st.session_state.roadmap_json = roadmap_json
            st.success("Roadmap loaded successfully!")
            
            # Display roadmap info
            teaching_style = roadmap_json.get("TeachingStyle", "normal")
            st.info(f"**Teaching Style:** {teaching_style}")
            
            # Show subtopics
            subtopics = {k: v for k, v in roadmap_json.items() if k.startswith("Subtopic")}
            st.markdown(f"**Total Subtopics:** {len(subtopics)}")
            
        except json.JSONDecodeError:
            st.error("Invalid JSON file. Please upload a valid roadmap JSON.")
        except Exception as e:
            st.error(f"Error loading roadmap: {str(e)}")
    
    st.markdown("---")
    
    # Context viewer
    st.header("📊 Progress")
    context_manager = st.session_state.content_agent.context_manager
    completed_ids = context_manager.get_completed_subtopic_ids()
    
    if completed_ids:
        st.success(f"**Completed:** {len(completed_ids)} subtopic(s)")
        for subtopic_id in completed_ids:
            st.markdown(f"- {subtopic_id}")
    else:
        st.info("No subtopics completed yet")
    
    # Reset context button
    if st.button("🔄 Reset Context", help="Clear all completed subtopics"):
        context_manager.reset_context()
        st.session_state.generated_content = None
        st.session_state.generated_quiz = None
        st.rerun()
    
    # Delete generated content button
    if st.button("🗑️ Delete All Generated Content", help="Delete all generated content files"):
        if os.path.exists("generated_content"):
            try:
                shutil.rmtree("generated_content")
                st.success("✅ All generated content deleted!")
                st.rerun()
            except Exception as e:
                st.error(f"Error deleting content: {str(e)}")
        else:
            st.info("No generated content to delete")

# Main content area
if st.session_state.roadmap_json:
    roadmap_json = st.session_state.roadmap_json
    
    # Get current subtopic info
    context_manager = st.session_state.content_agent.context_manager
    completed_ids = context_manager.get_completed_subtopic_ids()
    all_subtopics = sorted(
        [k for k in roadmap_json.keys() if k.startswith("Subtopic")],
        key=lambda x: int(x.replace("Subtopic", ""))
    )
    
    next_subtopic_id = None
    for subtopic_id in all_subtopics:
        if subtopic_id not in completed_ids:
            next_subtopic_id = subtopic_id
            break
    
    if not next_subtopic_id:
        st.success("🎉 All subtopics have been completed!")
        
        # Generate mega quiz button
        if st.button("📝 Generate Mega Quiz"):
            with st.spinner("Generating comprehensive quiz covering all subtopics..."):
                mega_quiz = st.session_state.content_agent.generate_mega_quiz()
                
                if "error" not in mega_quiz:
                    st.session_state.mega_quiz = mega_quiz
                    st.success("Mega quiz generated successfully!")
                    st.rerun()
                else:
                    st.error(mega_quiz.get("error", "Failed to generate mega quiz"))
        
        # Display mega quiz if available
        if "mega_quiz" in st.session_state:
            st.markdown("---")
            display_quiz(st.session_state.mega_quiz.get("questions", []))
    else:
        next_subtopic_data = roadmap_json.get(next_subtopic_id, {})
        topic_name = next_subtopic_data.get("TopicName", "")
        time_to_complete = next_subtopic_data.get("SuggestedTimeToComplete", "")
        
        st.markdown("---")
        st.markdown(f"### Current Subtopic: {next_subtopic_id}")
        st.markdown(f"**Topic:** {topic_name}")
        st.markdown(f"**Estimated Time:** {time_to_complete}")
        
        # Generate content button
        if st.button(f"🚀 Generate Content for {next_subtopic_id}", type="primary"):
            # Create progress container
            progress_container = st.container()
            status_container = st.container()
            
            with progress_container:
                progress_bar = st.progress(0)
                status_text = st.empty()
            
            try:
                # Initialize state
                initial_state = {
                    "roadmap_json": roadmap_json,
                    "messages": [],
                    "actions": [],
                    "content_complete": False
                }
                
                # Track progress through nodes
                node_progress = {
                    "load_roadmap": 10,
                    "load_context": 20,
                    "research_content": 40,
                    "generate_content": 60,
                    "generate_graphs": 75,
                    "generate_quiz": 85,
                    "save_context": 100
                }
                
                # Run the graph
                result = None
                with status_container:
                    status_text.info("🔄 Starting content generation...")
                    progress_bar.progress(5)
                    
                    # Invoke graph
                    result = st.session_state.content_agent.graph.invoke(initial_state)
                    
                    progress_bar.progress(100)
                    status_text.success("✅ Content generation complete!")
                
                # Display actions
                actions = result.get("actions", [])
                if actions:
                    with status_container:
                        st.markdown("### 🔄 Generation Process")
                        for action in actions:
                            display_action(action)
                    
                    # Show final stats
                    content_length = len(result.get("generated_content", ""))
                    if content_length > 0:
                        st.success(f"✅ Generated {content_length:,} characters of content")
                
                # Store results
                st.session_state.generated_content = result.get("generated_content")
                st.session_state.generated_quiz = result.get("generated_quiz")
                st.session_state.current_subtopic = next_subtopic_id
                st.session_state.generated_graphs = result.get("generated_graphs", [])
                
                st.rerun()
                
            except Exception as e:
                with status_container:
                    st.error(f"❌ Error generating content: {str(e)}")
                    import traceback
                    with st.expander("🔍 Error Details"):
                        st.code(traceback.format_exc())
        
        # Display generated content
        if st.session_state.generated_content and st.session_state.current_subtopic == next_subtopic_id:
            st.markdown("---")
            st.markdown("## 📖 Generated Content")
            
            # Show content stats
            content = st.session_state.generated_content
            content_length = len(content)
            word_count = len(content.split())
            reading_time = max(1, word_count // 200)  # Average reading speed: 200 words/min
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Characters", f"{content_length:,}")
            with col2:
                st.metric("Words", f"{word_count:,}")
            with col3:
                st.metric("Reading Time", f"~{reading_time} min")
            
            # Count content elements
            equations = content.count("$$") // 2 + content.count("$") // 2
            examples = content.lower().count("example")
            sections = content.count("##")
            
            st.info(f"📊 Content includes: {equations} equations, {examples} examples, {sections} sections")
            
            # Display full content in a scrollable container
            st.markdown("### 📄 Full Content")
            st.markdown(
                '<div style="max-height: 900px; overflow-y: auto; border: 2px solid #4CAF50; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">',
                unsafe_allow_html=True
            )
            render_latex_in_markdown(content)
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Also provide expandable view
            with st.expander("📋 View Content Summary", expanded=False):
                # Show first 1000 chars as preview
                preview = content[:1000] + "..." if len(content) > 1000 else content
                st.markdown(preview)
            
            # Display graphs if any
            if st.session_state.get("generated_graphs"):
                st.markdown("---")
                st.markdown("## 📊 Generated Graphs")
                
                for i, graph in enumerate(st.session_state.generated_graphs, 1):
                    graph_title = graph.get('title', f'Graph {i}')
                    graph_type = graph.get('type', 'unknown')
                    graph_description = graph.get('description', '')
                    graph_code = graph.get('code', '')
                    
                    # Create a card for each graph
                    st.markdown(f"""
                    <div style='border: 2px solid #2196F3; border-radius: 10px; padding: 15px; margin: 15px 0; background-color: #f0f8ff;'>
                        <h3 style='color: #2196F3; margin: 0;'>📈 {graph_title}</h3>
                        <p style='color: #666; margin: 5px 0;'><strong>Type:</strong> {graph_type}</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    if graph_description:
                        st.markdown(f"**Description:** {graph_description}")
                    
                    # Execute and display the graph
                    if graph_code:
                        # Clean the code - remove markdown code blocks if present
                        clean_code = re.sub(r'```python\s*', '', graph_code)
                        clean_code = re.sub(r'```\s*$', '', clean_code)
                        clean_code = clean_code.strip()
                        
                        # Remove plt.show() if present
                        clean_code = re.sub(r'plt\.show\(\)\s*', '', clean_code)
                        
                        # Ensure imports are present
                        if 'import matplotlib.pyplot' not in clean_code:
                            clean_code = 'import matplotlib.pyplot as plt\n' + clean_code
                        if 'import numpy' not in clean_code:
                            clean_code = 'import numpy as np\n' + clean_code
                        
                        # Add random seed for reproducibility if not present
                        if 'np.random.seed' not in clean_code and 'random.seed' not in clean_code:
                            # Insert after numpy import
                            clean_code = clean_code.replace('import numpy as np', 'import numpy as np\nnp.random.seed(42)')
                        
                        # Execute and display graph
                        try:
                            fig = execute_graph_code(clean_code)
                            if fig and len(fig.get_axes()) > 0:
                                st.pyplot(fig, use_container_width=True)
                            else:
                                st.warning("Could not generate graph. Showing code instead:")
                                st.code(clean_code, language='python')
                        except Exception as e:
                            st.error(f"Error displaying graph: {str(e)}")
                            import traceback
                            with st.expander("Error Details"):
                                st.code(traceback.format_exc())
                            st.code(clean_code, language='python')
                    
                    # Show code in expandable section
                    with st.expander(f"📄 View Code for {graph_title}", expanded=False):
                        st.code(graph_code if graph_code else "No code available", language='python')
                    
                    st.markdown("---")
            
            # Display quiz
            if st.session_state.generated_quiz:
                st.markdown("---")
                display_quiz(st.session_state.generated_quiz)
            
            # Download buttons
            st.markdown("---")
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("📥 Download Content"):
                    content_file = f"{next_subtopic_id}_content.md"
                    st.download_button(
                        label="Download Markdown",
                        data=st.session_state.generated_content,
                        file_name=content_file,
                        mime="text/markdown"
                    )
            
            with col2:
                if st.session_state.generated_quiz:
                    quiz_json = json.dumps({
                        "subtopic_id": next_subtopic_id,
                        "questions": st.session_state.generated_quiz
                    }, indent=2)
                    st.download_button(
                        label="📥 Download Quiz",
                        data=quiz_json,
                        file_name=f"{next_subtopic_id}_quiz.json",
                        mime="application/json"
                    )
    
    # Show all completed subtopics
    if completed_ids:
        st.markdown("---")
        st.markdown("## ✅ Completed Subtopics")
        
        for subtopic_id in completed_ids:
            with st.expander(f"{subtopic_id} - View Full Content", expanded=False):
                # Try to load content from file
                content_file = f"generated_content/{subtopic_id}/content.md"
                if os.path.exists(content_file):
                    with open(content_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Show stats
                    content_length = len(content)
                    st.info(f"📊 Content length: {content_length:,} characters")
                    
                    # Display full content in scrollable container
                    st.markdown(
                        '<div style="max-height: 600px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">',
                        unsafe_allow_html=True
                    )
                    render_latex_in_markdown(content)
                    st.markdown('</div>', unsafe_allow_html=True)
                else:
                    st.info("Content file not found")

else:
    st.info("👈 Please upload a roadmap JSON file to get started")
    
    # Show sample structure
    with st.expander("📋 Expected Roadmap Structure"):
        st.json({
            "TeachingStyle": "normal",
            "Subtopic1": {
                "TopicName": "Example Topic",
                "ContentList": {
                    "topics": ["Topic 1", "Topic 2"],
                    "videos": [],
                    "blogs": [],
                    "books": []
                },
                "SuggestedTimeToComplete": "2-3 weeks"
            }
        })

# Footer
st.markdown("---")
st.markdown("""
### 🔧 Environment Variables Required:
- `GOOGLE_API_KEY`: For Gemini-powered content generation
""")

