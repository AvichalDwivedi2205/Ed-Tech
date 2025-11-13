"""
Combined Streamlit App for OpenT Agents
Contains both Roadmap Generator and Content Creator interfaces
"""
import streamlit as st
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir.parent))

# Page config
st.set_page_config(
    page_title="OpenT Agents",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Sidebar navigation
st.sidebar.title("🚀 OpenT Agents")
page = st.sidebar.radio(
    "Select Agent",
    ["Roadmap Generator", "Content Creator"],
    index=0
)

# Import based on selected page
if page == "Roadmap Generator":
    from streamlit_pages import roadmap_page
    roadmap_page.render()
else:
    from streamlit_pages import content_page
    content_page.render()

