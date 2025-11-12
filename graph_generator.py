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
from content_tools import GraphGenerator


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

Requirements:
- Graph type: {graph_type}
- Title: {title}
- X-axis label: {xlabel}
- Y-axis label: {ylabel}
- Description: {description}

Generate realistic data that matches the description. Return ONLY the Python code, no explanations."""),
                HumanMessage(content=f"Generate matplotlib code for: {description}")
            ])
            
            chain = prompt | self.llm
            response = chain.invoke({})
            
            code = response.content.strip()
            
            # Clean up code (remove markdown code blocks if present)
            code = re.sub(r'```python\s*', '', code)
            code = re.sub(r'```\s*$', '', code)
            code = code.strip()
            
            # If LLM didn't generate good code, use template
            if not code or len(code) < 50:
                code = self.graph_generator.generate_plot_code(
                    graph_type, description, title, xlabel, ylabel
                )
            
            generated_graphs.append({
                "type": graph_type,
                "code": code,
                "description": description,
                "title": title,
                "xlabel": xlabel,
                "ylabel": ylabel
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
            
            # Basic validation
            has_import = "import matplotlib" in code or "import numpy" in code
            has_plot = any(keyword in code for keyword in ["plt.plot", "plt.scatter", "plt.bar", "plot_surface", "contour"])
            has_show = "plt.show()" in code or "plt.savefig" in code
            
            if has_import and (has_plot or has_show):
                validated_graphs.append(graph)
            else:
                # Try to fix code
                if not has_import:
                    code = "import matplotlib.pyplot as plt\nimport numpy as np\n\n" + code
                if not has_show:
                    code = code + "\nplt.show()"
                
                graph["code"] = code
                validated_graphs.append(graph)
                actions.append({"type": "warning", "message": f"Fixed code for {graph.get('title', 'graph')}"})
        
        return {
            **state,
            "generated_graphs": validated_graphs,
            "graphs_complete": True,
            "actions": actions
        }
    
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

