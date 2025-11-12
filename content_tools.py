"""
Tools for content generation: LaTeX, graphs, charts
"""
import re
from typing import List, Dict, Optional


class LaTeXGenerator:
    """Helper for LaTeX equation generation"""
    
    @staticmethod
    def wrap_equation(equation: str, display: bool = True) -> str:
        """Wrap LaTeX equation in appropriate delimiters"""
        if display:
            return f"$${equation}$$"
        return f"${equation}$"
    
    @staticmethod
    def extract_equations_from_text(text: str) -> List[str]:
        """Extract LaTeX equations from text"""
        equations = []
        # Find all $$...$$ patterns (display math)
        display_eqs = re.findall(r'\$\$(.*?)\$\$', text, re.DOTALL)
        equations.extend([eq.strip() for eq in display_eqs])
        
        # Find all $...$ patterns (inline math) - but avoid matching display math
        # Use negative lookahead/lookbehind to avoid matching $$...$$
        inline_pattern = r'(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)'
        inline_eqs = re.findall(inline_pattern, text, re.DOTALL)
        equations.extend([eq.strip() for eq in inline_eqs])
        
        return equations
    
    @staticmethod
    def validate_latex(equation: str) -> bool:
        """Basic validation of LaTeX syntax"""
        # Check for common LaTeX commands
        common_commands = ['\\frac', '\\sqrt', '\\sum', '\\int', '\\alpha', '\\beta', 
                          '\\gamma', '\\theta', '\\pi', '\\lambda', '\\mu', '\\sigma']
        # Check if it contains at least some LaTeX-like structure
        has_backslash = '\\' in equation
        has_math_symbols = any(char in equation for char in ['^', '_', '{', '}'])
        return has_backslash or has_math_symbols


class GraphGenerator:
    """Generate code for graphs and charts"""
    
    @staticmethod
    def generate_plot_code(plot_type: str, data_description: str, 
                          title: str, xlabel: str, ylabel: str,
                          x_data: Optional[str] = None,
                          y_data: Optional[str] = None) -> str:
        """Generate matplotlib/plotly code for visualization"""
        plot_type_lower = plot_type.lower()
        
        if plot_type_lower == "line":
            return f"""
```python
import matplotlib.pyplot as plt
import numpy as np

# {data_description}
# Generate data
{x_data if x_data else 'x = np.linspace(0, 10, 100)'}
{y_data if y_data else 'y = np.sin(x)  # Example - replace with actual data'}

# Create plot
plt.figure(figsize=(10, 6))
plt.plot(x, y, linewidth=2)
plt.title('{title}')
plt.xlabel('{xlabel}')
plt.ylabel('{ylabel}')
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
```
"""
        elif plot_type_lower == "scatter":
            return f"""
```python
import matplotlib.pyplot as plt
import numpy as np

# {data_description}
# Generate data
{x_data if x_data else 'x = np.random.randn(100)'}
{y_data if y_data else 'y = np.random.randn(100)'}

# Create scatter plot
plt.figure(figsize=(10, 6))
plt.scatter(x, y, alpha=0.6, s=50)
plt.title('{title}')
plt.xlabel('{xlabel}')
plt.ylabel('{ylabel}')
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
```
"""
        elif plot_type_lower == "bar":
            return f"""
```python
import matplotlib.pyplot as plt
import numpy as np

# {data_description}
# Generate data
{x_data if x_data else 'categories = ["A", "B", "C", "D", "E"]'}
{y_data if y_data else 'values = np.random.randint(10, 100, len(categories))'}

# Create bar chart
plt.figure(figsize=(10, 6))
plt.bar(categories, values, alpha=0.7)
plt.title('{title}')
plt.xlabel('{xlabel}')
plt.ylabel('{ylabel}')
plt.grid(True, alpha=0.3, axis='y')
plt.tight_layout()
plt.show()
```
"""
        elif plot_type_lower == "3d" or plot_type_lower == "3d_plot":
            return f"""
```python
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np

# {data_description}
# Generate 3D data
x = np.linspace(-5, 5, 50)
y = np.linspace(-5, 5, 50)
X, Y = np.meshgrid(x, y)
Z = np.sin(np.sqrt(X**2 + Y**2))  # Example - replace with actual data

# Create 3D plot
fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')
ax.plot_surface(X, Y, Z, cmap='viridis', alpha=0.8)
ax.set_title('{title}')
ax.set_xlabel('{xlabel}')
ax.set_ylabel('{ylabel}')
ax.set_zlabel('Z')
plt.tight_layout()
plt.show()
```
"""
        elif plot_type_lower == "contour":
            return f"""
```python
import matplotlib.pyplot as plt
import numpy as np

# {data_description}
# Generate 2D data
x = np.linspace(-5, 5, 100)
y = np.linspace(-5, 5, 100)
X, Y = np.meshgrid(x, y)
Z = np.sin(np.sqrt(X**2 + Y**2))  # Example - replace with actual data

# Create contour plot
plt.figure(figsize=(10, 8))
contour = plt.contour(X, Y, Z, levels=20)
plt.clabel(contour, inline=True, fontsize=8)
plt.colorbar(contour)
plt.title('{title}')
plt.xlabel('{xlabel}')
plt.ylabel('{ylabel}')
plt.tight_layout()
plt.show()
```
"""
        else:
            # Default to line plot
            return GraphGenerator.generate_plot_code(
                "line", data_description, title, xlabel, ylabel, x_data, y_data
            )
    
    @staticmethod
    def analyze_content_for_graphs(content: str) -> List[Dict]:
        """Analyze content to identify where graphs are needed"""
        graph_indicators = [
            ("plot", "line"),
            ("graph", "line"),
            ("visualize", "line"),
            ("trend", "line"),
            ("correlation", "scatter"),
            ("scatter", "scatter"),
            ("compare", "bar"),
            ("comparison", "bar"),
            ("distribution", "bar"),
            ("3d", "3d"),
            ("three-dimensional", "3d"),
            ("contour", "contour"),
            ("surface", "3d"),
        ]
        
        graphs_needed = []
        content_lower = content.lower()
        
        for indicator, graph_type in graph_indicators:
            if indicator in content_lower:
                # Find context around the indicator
                idx = content_lower.find(indicator)
                context_start = max(0, idx - 100)
                context_end = min(len(content), idx + 100)
                context = content[context_start:context_end]
                
                graphs_needed.append({
                    "type": graph_type,
                    "context": context,
                    "indicator": indicator
                })
        
        return graphs_needed
    
    @staticmethod
    def generate_graph_suggestions(content: str) -> List[str]:
        """Generate suggestions for graphs based on content"""
        graphs = GraphGenerator.analyze_content_for_graphs(content)
        suggestions = []
        
        for graph in graphs:
            suggestions.append(
                f"Consider adding a {graph['type']} plot to visualize: {graph['context'][:100]}..."
            )
        
        return suggestions


class ContentFormatter:
    """Format content with proper structure"""
    
    @staticmethod
    def format_with_latex(content: str) -> str:
        """Ensure LaTeX equations are properly formatted"""
        # This is mainly a pass-through, but could add validation
        return content
    
    @staticmethod
    def insert_graph_code(content: str, graph_code: str, position: str = "end") -> str:
        """Insert graph code into content at specified position"""
        if position == "end":
            return f"{content}\n\n{graph_code}"
        elif position == "beginning":
            return f"{graph_code}\n\n{content}"
        else:
            # Try to find a good insertion point
            # Look for sections that mention visualization
            lines = content.split('\n')
            insertion_idx = len(lines)
            
            for i, line in enumerate(lines):
                if any(keyword in line.lower() for keyword in ['visualize', 'plot', 'graph', 'chart']):
                    insertion_idx = i + 1
                    break
            
            lines.insert(insertion_idx, graph_code)
            return '\n'.join(lines)
    
    @staticmethod
    def extract_sections(content: str) -> List[Dict]:
        """Extract sections from markdown content"""
        sections = []
        lines = content.split('\n')
        current_section = {"title": "", "content": []}
        
        for line in lines:
            if line.startswith('#'):
                if current_section["title"]:
                    sections.append({
                        "title": current_section["title"],
                        "content": '\n'.join(current_section["content"])
                    })
                current_section = {
                    "title": line.strip('#').strip(),
                    "content": []
                }
            else:
                current_section["content"].append(line)
        
        # Add last section
        if current_section["title"]:
            sections.append({
                "title": current_section["title"],
                "content": '\n'.join(current_section["content"])
            })
        
        return sections

