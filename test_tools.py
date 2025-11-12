"""
Test script to verify all tools are working correctly
"""
import os
from dotenv import load_dotenv
from tools import PerplexitySearchTool, ScraperTool
from content_research import ContentResearchTool, TavilySearchTool

load_dotenv()

def test_perplexity():
    """Test Perplexity search tool"""
    print("=" * 60)
    print("Testing Perplexity Search Tool")
    print("=" * 60)
    try:
        tool = PerplexitySearchTool()
        results = tool.run("microwave engineering tutorial", max_results=3)
        print(f"✅ Perplexity Search: SUCCESS")
        print(f"Results length: {len(results)} characters")
        print(f"First 200 chars: {results[:200]}...")
        return True
    except Exception as e:
        print(f"❌ Perplexity Search: FAILED - {str(e)}")
        return False

def test_scraper():
    """Test Scraper tool"""
    print("\n" + "=" * 60)
    print("Testing Scraper Tool (MIT OCW)")
    print("=" * 60)
    try:
        tool = ScraperTool()
        results = tool.run("microwave engineering", max_results=3)
        print(f"✅ Scraper Tool: SUCCESS")
        print(f"Results length: {len(results)} characters")
        print(f"First 200 chars: {results[:200]}...")
        return True
    except Exception as e:
        print(f"❌ Scraper Tool: FAILED - {str(e)}")
        return False

def test_tavily():
    """Test Tavily search tool"""
    print("\n" + "=" * 60)
    print("Testing Tavily Search Tool")
    print("=" * 60)
    try:
        tool = TavilySearchTool()
        results = tool.run("microwave engineering course", max_results=3)
        print(f"✅ Tavily Search: SUCCESS")
        print(f"Results length: {len(results)} characters")
        print(f"First 200 chars: {results[:200]}...")
        return True
    except Exception as e:
        print(f"⚠️  Tavily Search: NOT AVAILABLE - {str(e)}")
        print("   (This is optional, continuing without it)")
        return True  # Not critical

def test_content_research():
    """Test Content Research Tool"""
    print("\n" + "=" * 60)
    print("Testing Content Research Tool")
    print("=" * 60)
    try:
        tool = ContentResearchTool()
        topics = ["Introduction to Microwave Frequencies", "Maxwell's Equations"]
        results = tool.research_subtopic("Microwave Engineering", topics)
        
        print(f"✅ Content Research Tool: SUCCESS")
        print(f"Trusted sources found: {len(results.get('trusted_sources', '')) > 0}")
        print(f"Topic resources found: {len(results.get('topic_resources', {}))}")
        
        # Check topic resources
        for topic, resources in results.get('topic_resources', {}).items():
            videos = len(resources.get('videos', []))
            articles = len(resources.get('articles', []))
            print(f"  - {topic}: {videos} videos, {articles} articles")
        
        return True
    except Exception as e:
        print(f"❌ Content Research Tool: FAILED - {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False

def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("TOOL TESTING SUITE")
    print("=" * 60)
    
    results = []
    
    # Test individual tools
    results.append(("Perplexity", test_perplexity()))
    results.append(("Scraper", test_scraper()))
    results.append(("Tavily", test_tavily()))
    results.append(("Content Research", test_content_research()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for tool_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{tool_name:20s}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All critical tools are working correctly!")
    else:
        print("\n⚠️  Some tools failed. Please check your API keys and configuration.")
    
    return all_passed

if __name__ == "__main__":
    main()

