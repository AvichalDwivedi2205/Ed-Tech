"""
Graph Generator Sub-Agent using LangGraph
Analyzes content and generates visualization code
"""
from typing import TypedDict, Annotated, List, Dict, Literal, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
import re
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import io
import base64
from .content_tools import GraphGenerator


class GraphState(TypedDict):
    """State for graph generation sub-agent"""
    content: str
    graph_requirements: List[Dict]
    generated_graphs: List[Dict]
    actions: Annotated[list, lambda x, y: x + y]
    graphs_complete: bool


class GraphGeneratorAgent:
    """Generate graphs and charts for content"""
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self.llm = llm
        self.graph_generator = GraphGenerator()
        self.graph = self._build_graph()
    
    def _build_graph(self):
        """Build LangGraph workflow for graph generation"""
        workflow = StateGraph(GraphState)
        
        workflow.add_node("analyze_content", self.analyze_content)
        workflow.add_node("determine_graph_type", self.determine_graph_type)
        workflow.add_node("generate_code", self.generate_code)
        workflow.add_node("validate_code", self.validate_code)
        
        workflow.set_entry_point("analyze_content")
        workflow.add_edge("analyze_content", "determine_graph_type")
        workflow.add_edge("determine_graph_type", "generate_code")
        workflow.add_edge("generate_code", "validate_code")
        workflow.add_edge("validate_code", END)
        
        return workflow.compile()
    
    def analyze_content(self, state: GraphState) -> GraphState:
        """Identify where graphs are needed"""
        content = state.get("content", "")
        actions = state.get("actions", [])
        
        # Use LLM to identify graph needs
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are an expert at analyzing educational content to identify where visualizations would be helpful.

Analyze the content and identify:
1. Mathematical functions or equations that should be plotted
2. Data relationships that need visualization
3. Comparisons that would benefit from charts
4. Trends or patterns that need graphs

Return a JSON array of graph requirements, each with:
- description: What should be visualized
- type: Suggested graph type (line, scatter, bar, 3d, contour)
- context: Relevant content excerpt
- title: Suggested title for the graph
- xlabel: X-axis label
- ylabel: Y-axis label"""),
            HumanMessage(content=f"Analyze this content and identify where graphs are needed:\n\n{content[:3000]}\n\nReturn JSON array of graph requirements.")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({})
        
        try:
            import json
            graph_requirements = json.loads(response.content.strip())
            if not isinstance(graph_requirements, list):
                graph_requirements = []
        except:
            # Fallback: use content_tools analyzer
            graph_requirements = self.graph_generator.analyze_content_for_graphs(content)
            # Convert to required format
            graph_requirements = [
                {
                    "description": req.get("context", ""),
                    "type": req.get("type", "line"),
                    "context": req.get("context", ""),
                    "title": f"Visualization {i+1}",
                    "xlabel": "X",
                    "ylabel": "Y"
                }
                for i, req in enumerate(graph_requirements[:5])  # Limit to 5 graphs
            ]
        
        actions.append({"type": "info", "message": f"Identified {len(graph_requirements)} graph requirements"})
        
        return {
            **state,
            "graph_requirements": graph_requirements if isinstance(graph_requirements, list) else [],
            "actions": actions
        }
    
    def determine_graph_type(self, state: GraphState) -> GraphState:
        """Determine appropriate graph type for each requirement"""
        graph_requirements = state.get("graph_requirements", [])
        actions = state.get("actions", [])
        
        # Enhance requirements with better graph type determination
        enhanced_requirements = []
        for req in graph_requirements:
            graph_type = req.get("type", "line")
            description = req.get("description", "").lower()
            
            # Refine graph type based on description
            if any(word in description for word in ["correlation", "relationship", "scatter"]):
                graph_type = "scatter"
            elif any(word in description for word in ["compare", "comparison", "category", "bar"]):
                graph_type = "bar"
            elif any(word in description for word in ["3d", "three-dimensional", "surface"]):
                graph_type = "3d"
            elif any(word in description for word in ["contour", "level", "2d function"]):
                graph_type = "contour"
            elif any(word in description for word in ["function", "plot", "trend", "line"]):
                graph_type = "line"
            
            req["type"] = graph_type
            enhanced_requirements.append(req)
        
        return {
            **state,
            "graph_requirements": enhanced_requirements,
            "actions": actions
        }
    
    def generate_code(self, state: GraphState) -> GraphState:
        """Generate Python code for visualizations"""
        graph_requirements = state.get("graph_requirements", [])
        actions = state.get("actions", [])
        generated_graphs = []
        
        for req in graph_requirements:
            graph_type = req.get("type", "line")
            description = req.get("description", "")
            title = req.get("title", "Graph")
            xlabel = req.get("xlabel", "X")
            ylabel = req.get("ylabel", "Y")
            
            # Use LLM to generate appropriate data and code
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content=f"""You are an expert at generating Python code for data visualization.

Generate Python code using matplotlib to create a {graph_type} plot.

CRITICAL REQUIREMENTS:
- Graph type: {graph_type}
- Title: {title}
- X-axis label: {xlabel}
- Y-axis label: {ylabel}
- Description: {description}
- MUST include: np.random.seed(42) for reproducibility
- Generate realistic data that matches the description
- DO NOT include plt.show() - the code will be executed in Streamlit
- Return ONLY the Python code, no markdown code blocks, no explanations

Code structure:
import matplotlib.pyplot as plt
import numpy as np

np.random.seed(42)  # For reproducibility

# Generate data
[your data generation code]

# Create plot
[your plotting code]

plt.tight_layout()
# Do NOT include plt.show()"""),
                HumanMessage(content=f"Generate matplotlib code for: {description}")
            ])
            
            chain = prompt | self.llm
            response = chain.invoke({})
            
            code = response.content.strip() if hasattr(response, 'content') else str(response)
            
            # Aggressively clean up code
            # Remove markdown code blocks
            code = re.sub(r'```python\s*', '', code)
            code = re.sub(r'```json\s*', '', code)
            code = re.sub(r'```\s*$', '', code)
            
            # Remove instruction lines
            lines = code.split('\n')
            cleaned_lines = []
            for line in lines:
                line_lower = line.lower().strip()
                # Skip instruction lines
                if any(phrase in line_lower for phrase in ['do not include', 'do not', 'must include', 'critical', 'requirements:', 'output format', 'return only', 'code structure:']):
                    continue
                # Skip empty comment lines that are instructions
                if line.strip().startswith('#') and any(phrase in line_lower for phrase in ['do not', 'must', 'critical']):
                    continue
                cleaned_lines.append(line)
            code = '\n'.join(cleaned_lines)
            
            # Remove instruction comments
            code = re.sub(r'#\s*(Do NOT|MUST|CRITICAL|Output|Return|Code structure).*?\n', '\n', code, flags=re.IGNORECASE)
            
            code = code.strip()
            
            # If LLM didn't generate good code, use template
            if not code or len(code) < 50:
                code = self.graph_generator.generate_plot_code(
                    graph_type, description, title, xlabel, ylabel
                )
            
            # Generate base64 image from code
            image_base64 = self._generate_graph_image(code)
            
            generated_graphs.append({
                "type": graph_type,
                "code": code,
                "description": description,
                "title": title,
                "xlabel": xlabel,
                "ylabel": ylabel,
                "imageBase64": image_base64
            })
        
        actions.append({"type": "success", "message": f"Generated {len(generated_graphs)} graph codes"})
        
        return {
            **state,
            "generated_graphs": generated_graphs,
            "actions": actions
        }
    
    def validate_code(self, state: GraphState) -> GraphState:
        """Validate generated code"""
        generated_graphs = state.get("generated_graphs", [])
        actions = state.get("actions", [])
        validated_graphs = []
        
        for graph in generated_graphs:
            code = graph.get("code", "")
            
            # Basic validation and fixes
            has_import = "import matplotlib" in code or "import numpy" in code
            has_plot = any(keyword in code for keyword in ["plt.plot", "plt.scatter", "plt.bar", "plot_surface", "contour", "ax.plot", "ax.scatter"])
            
            # Fix code if needed
            if not has_import:
                code = "import matplotlib.pyplot as plt\nimport numpy as np\n\n" + code
            
            # Remove plt.show() if present (not needed for Streamlit)
            code = re.sub(r'plt\.show\(\)\s*', '', code, flags=re.MULTILINE)
            
            # Remove instruction lines that might have been included
            lines = code.split('\n')
            cleaned_lines = []
            for line in lines:
                line_lower = line.lower().strip()
                if any(phrase in line_lower for phrase in ['do not include', 'do not', 'must include', 'critical']):
                    continue
                cleaned_lines.append(line)
            code = '\n'.join(cleaned_lines)
            
            # Add random seed if not present
            if 'np.random.seed' not in code and 'random.seed' not in code:
                # Insert after numpy import
                if 'import numpy as np' in code:
                    code = code.replace('import numpy as np', 'import numpy as np\nnp.random.seed(42)')
                elif 'import numpy' in code:
                    code = code.replace('import numpy', 'import numpy as np\nnp.random.seed(42)')
            
            # Ensure tight_layout is present (but not duplicate)
            if 'plt.tight_layout()' not in code and 'fig.tight_layout()' not in code:
                code = code.rstrip() + '\nplt.tight_layout()'
            
            # Generate base64 image from code
            image_base64 = self._generate_graph_image(code)
            
            graph["code"] = code
            graph["imageBase64"] = image_base64
            validated_graphs.append(graph)
        
        return {
            **state,
            "generated_graphs": validated_graphs,
            "graphs_complete": True,
            "actions": actions
        }
    
    def _generate_graph_image(self, code: str) -> Optional[str]:
        """
        Execute matplotlib code and return base64 encoded PNG image.
        
        Args:
            code: Python code that generates a matplotlib plot
            
        Returns:
            Base64 encoded PNG image string or None if generation fails
        """
        try:
            # Clear any existing figures
            plt.clf()
            plt.close('all')
            
            # Create namespace for code execution
            namespace = {
                'plt': plt,
                'np': np,
                '__builtins__': __builtins__,
            }
            
            # Try to import 3D if needed
            try:
                from mpl_toolkits.mplot3d import Axes3D
                namespace['Axes3D'] = Axes3D
            except ImportError:
                pass
            
            # Execute the code
            exec(code, namespace)
            
            # Get the current figure
            fig = plt.gcf()
            
            # Check if figure has any axes
            if len(fig.get_axes()) == 0:
                plt.close(fig)
                return None
            
            # Save to bytes buffer
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
            buf.seek(0)
            
            # Convert to base64
            image_base64 = base64.b64encode(buf.read()).decode('utf-8')
            
            # Close figure to free memory
            plt.close(fig)
            buf.close()
            
            return f"data:image/png;base64,{image_base64}"
            
        except Exception as e:
            # Log error but don't fail completely
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to generate graph image: {str(e)}")
            plt.clf()
            plt.close('all')
            return None
    
    def generate_graphs_for_content(self, content: str) -> List[Dict]:
        """Generate graphs for content (convenience method)"""
        initial_state = {
            "content": content,
            "graph_requirements": [],
            "generated_graphs": [],
            "actions": [],
            "graphs_complete": False
        }
        
        result = self.graph.invoke(initial_state)
        return result.get("generated_graphs", [])

