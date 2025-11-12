"""
Content Research Tools for Content Creator Agent
- Scrapes trusted sources (MIT OCW, Stanford, etc.)
- Uses Tavily search for additional content
- Uses Perplexity to find videos and articles for specific topics
"""
import os
from typing import List, Dict, Optional
from dotenv import load_dotenv
from tools import PerplexitySearchTool, ScraperTool

load_dotenv()


class TavilySearchTool:
    """Tavily search tool for educational content discovery"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        if not self.api_key:
            raise ValueError("TAVILY_API_KEY environment variable not set")
        
        try:
            from tavily import TavilyClient
            self.client = TavilyClient(api_key=self.api_key)
        except ImportError:
            raise ImportError("tavily-python package not installed. Install with: pip install tavily-python")
    
    def run(self, query: str, max_results: int = 5, search_depth: str = "advanced") -> str:
        """Search using Tavily API"""
        try:
            response = self.client.search(
                query=query,
                max_results=max_results,
                search_depth=search_depth,
                include_answer=True,
                include_raw_content=False
            )
            
            formatted_results = []
            formatted_results.append(f"=== Tavily Search Results for: {query} ===\n")
            
            if response.get("results"):
                formatted_results.append("\n=== SEARCH RESULTS ===\n")
                for i, result in enumerate(response["results"][:max_results], 1):
                    title = result.get("title", "")
                    url = result.get("url", "")
                    content = result.get("content", "")
                    
                    formatted_results.append(f"RESULT {i}:")
                    formatted_results.append(f"TITLE: {title}")
                    formatted_results.append(f"URL: {url}")
                    if content:
                        formatted_results.append(f"CONTENT: {content[:300]}...")
                    formatted_results.append("")
            
            if response.get("answer"):
                formatted_results.append(f"\n=== SUMMARY ANSWER ===\n{response['answer']}\n")
            
            return "\n".join(formatted_results)
            
        except Exception as e:
            return f"Tavily search failed: {str(e)}"


class ContentResearchTool:
    """Comprehensive content research tool combining all sources"""
    
    def __init__(self):
        try:
            self.perplexity_tool = PerplexitySearchTool()
        except Exception as e:
            raise ValueError(f"PerplexitySearchTool initialization failed: {str(e)}")
        
        self.scraper_tool = ScraperTool()
        
        # Initialize Tavily if API key is available
        self.tavily_tool = None
        try:
            self.tavily_tool = TavilySearchTool()
        except (ValueError, ImportError) as e:
            # Tavily not available, continue without it
            print(f"Warning: Tavily search not available: {str(e)}")
            pass
    
    def research_subtopic(self, subtopic_name: str, topics: List[str]) -> Dict:
        """Research a subtopic from all sources"""
        results = {
            "trusted_sources": "",
            "tavily_content": "",
            "topic_resources": {}  # Resources for each topic
        }
        
        # 1. Scrape trusted sources for the subtopic
        try:
            trusted_content = self.scraper_tool.run(subtopic_name, max_results=5)
            results["trusted_sources"] = trusted_content
        except Exception as e:
            results["trusted_sources"] = f"Scraping failed: {str(e)}"
        
        # 2. Use Tavily for additional content (if available)
        if self.tavily_tool:
            try:
                tavily_content = self.tavily_tool.run(f"{subtopic_name} educational content course", max_results=5)
                results["tavily_content"] = tavily_content
            except Exception as e:
                results["tavily_content"] = f"Tavily search failed: {str(e)}"
        
        # 3. Find videos and articles for each topic
        for topic in topics:
            topic_resources = self.find_topic_resources(topic, subtopic_name)
            results["topic_resources"][topic] = topic_resources
        
        return results
    
    def find_topic_resources(self, topic: str, subtopic_context: str = "") -> Dict:
        """Find videos and articles for a specific topic"""
        resources = {
            "videos": [],
            "articles": []
        }
        
        # Search for YouTube videos
        video_query = f"{topic} {subtopic_context} YouTube tutorial video lecture educational"
        try:
            video_results = self.perplexity_tool.run(video_query, max_results=8)
            # Parse Perplexity results to extract video links
            videos = self._parse_perplexity_results(video_results, filter_youtube=True)
            resources["videos"] = videos[:5]  # Increased to 5 videos per topic
        except Exception as e:
            print(f"Warning: Video search failed for {topic}: {str(e)}")
            pass
        
        # Search for articles/blog posts
        article_query = f"{topic} {subtopic_context} article blog tutorial guide educational"
        try:
            article_results = self.perplexity_tool.run(article_query, max_results=8)
            articles = self._parse_perplexity_results(article_results, filter_youtube=False)
            resources["articles"] = articles[:5]  # Increased to 5 articles per topic
        except Exception as e:
            print(f"Warning: Article search failed for {topic}: {str(e)}")
            pass
        
        return resources
    
    def _parse_perplexity_results(self, results_text: str, filter_youtube: bool = False) -> List[Dict]:
        """Parse Perplexity search results into structured format"""
        resources = []
        lines = results_text.split('\n')
        
        current_resource = {}
        for line in lines:
            line = line.strip()
            if line.startswith("RESULT"):
                if current_resource:
                    resources.append(current_resource)
                current_resource = {}
            elif line.startswith("TITLE:"):
                current_resource["title"] = line.replace("TITLE:", "").strip()
            elif line.startswith("URL:"):
                url = line.replace("URL:", "").strip()
                # Filter YouTube if requested
                if filter_youtube:
                    if "youtube.com" in url or "youtu.be" in url:
                        current_resource["url"] = url
                    else:
                        current_resource = {}  # Skip non-YouTube
                        continue
                else:
                    # Skip YouTube for articles
                    if "youtube.com" not in url and "youtu.be" not in url:
                        current_resource["url"] = url
                    else:
                        current_resource = {}  # Skip YouTube
                        continue
            elif line.startswith("DESCRIPTION:"):
                current_resource["description"] = line.replace("DESCRIPTION:", "").strip()
        
        # Add last resource
        if current_resource and "url" in current_resource:
            resources.append(current_resource)
        
        return resources
    
    def format_resources_for_content(self, topic_resources: Dict) -> str:
        """Format resources for inclusion in content"""
        formatted = []
        
        for topic, resources in topic_resources.items():
            formatted.append(f"\n### Resources for: {topic}\n")
            
            if resources.get("videos"):
                formatted.append("**Videos:**")
                for video in resources["videos"]:
                    title = video.get("title", "Untitled")
                    url = video.get("url", "")
                    description = video.get("description", "")
                    if url:
                        formatted.append(f"- [{title}]({url})")
                        if description:
                            formatted.append(f"  - {description}")
                formatted.append("")
            
            if resources.get("articles"):
                formatted.append("**Articles:**")
                for article in resources["articles"]:
                    title = article.get("title", "Untitled")
                    url = article.get("url", "")
                    description = article.get("description", "")
                    if url:
                        formatted.append(f"- [{title}]({url})")
                        if description:
                            formatted.append(f"  - {description}")
                formatted.append("")
        
        return "\n".join(formatted)

