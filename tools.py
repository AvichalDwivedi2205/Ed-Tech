"""
Tools for the Roadmap Generator Agent
- OCR Tool (Gemini Vision)
- Perplexity Web Search Tool (with verified citations)
- Scraper Tool (MIT OpenCourseWare and trusted sources)
"""

import os
import time
from pathlib import Path
from typing import Optional

import google.generativeai as genai
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from perplexity import Perplexity

load_dotenv()


class OCRTool:
    """OCR tool powered exclusively by Gemini Vision models."""

    _IMAGE_MIME_TYPES = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
    }

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.5-flash"):
        self.google_api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.google_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable must be set for OCR")

        self.model_name = model_name
        genai.configure(api_key=self.google_api_key)
        self.model = genai.GenerativeModel(self.model_name)

    def run(self, file_path: str) -> str:
        """Extract text from image/PDF using Gemini Vision."""
        if not file_path or not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_suffix = Path(file_path).suffix.lower()

        if file_suffix in self._IMAGE_MIME_TYPES:
            return self._extract_from_image(file_path, self._IMAGE_MIME_TYPES[file_suffix])

        return self._extract_from_document(file_path)

    def _extract_from_image(self, file_path: str, mime_type: str) -> str:
        with open(file_path, "rb") as f:
            file_data = f.read()

        prompt = (
            "Extract all text from this image. Return only the extracted text without any additional commentary. "
            "Preserve the original structure, headings, bullet points, and numbering where applicable."
        )

        response = self.model.generate_content(
            [
                {"mime_type": mime_type, "data": file_data},
                {"text": prompt},
            ]
        )

        return self._extract_text_from_response(response)

    def _extract_from_document(self, file_path: str) -> str:
        uploaded_file = genai.upload_file(file_path)

        try:
            uploaded_file = self._wait_for_file_activation(uploaded_file)

            prompt = (
                "Extract all text from this document. Return only the extracted text without any additional commentary. "
                "Preserve the original structure, headings, bullet points, tables, and numbering where applicable."
            )

            response = self.model.generate_content(
                [
                    uploaded_file,
                    {"text": prompt},
                ]
            )

            return self._extract_text_from_response(response)

        finally:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass

    def _wait_for_file_activation(self, uploaded_file, poll_interval: float = 2.0, timeout: float = 60.0):
        """Poll until the uploaded file is ready for use."""
        elapsed = 0.0
        file_ref = uploaded_file

        while getattr(file_ref, "state", None) and getattr(file_ref.state, "name", "") == "PROCESSING":
            if elapsed > timeout:
                raise TimeoutError("Timed out waiting for Gemini to process the uploaded file.")

            time.sleep(poll_interval)
            elapsed += poll_interval
            file_ref = genai.get_file(file_ref.name)

        if getattr(file_ref, "state", None) and getattr(file_ref.state, "name", "") != "ACTIVE":
            raise RuntimeError(f"Gemini could not process the uploaded file (state: {getattr(file_ref.state, 'name', 'UNKNOWN')}).")

        return file_ref

    def _extract_text_from_response(self, response) -> str:
        if response is None:
            raise ValueError("Gemini returned no response for OCR request.")

        # Resolve streaming responses if necessary
        if hasattr(response, "resolve"):
            resolved = response.resolve()
            if resolved is not None:
                response = resolved

        if getattr(response, "text", None):
            text = response.text.strip()
            if text:
                return text

        candidates = getattr(response, "candidates", []) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            if not content:
                continue

            parts = getattr(content, "parts", []) or []
            collected = []
            for part in parts:
                part_text = getattr(part, "text", None)
                if part_text:
                    collected.append(part_text)

            if collected:
                text = "\n".join(collected).strip()
                if text:
                    return text

        raise ValueError("Gemini OCR returned an empty response.")


class PerplexitySearchTool:
    """Web search tool using Perplexity Search API SDK (as per official docs: https://docs.perplexity.ai/guides/search-quickstart)"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("PERPLEXITY_API_KEY")
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY environment variable not set")
        # Initialize Perplexity client (automatically uses PERPLEXITY_API_KEY from env)
        # Or pass explicitly if provided - as per docs: https://docs.perplexity.ai/guides/search-quickstart
        if api_key:
            self.client = Perplexity(api_key=api_key)
        else:
            self.client = Perplexity()  # Uses PERPLEXITY_API_KEY from environment
    
    def run(self, query: str, max_results: int = 8) -> str:
        """Search the web using Perplexity Search API SDK (as per official docs: https://docs.perplexity.ai/guides/search-quickstart)"""
        try:
            # Use Perplexity SDK exactly as shown in docs
            # https://docs.perplexity.ai/guides/search-quickstart#response
            search = self.client.search.create(
                query=query,
                max_results=min(max_results, 20),  # Perplexity allows 1-20 results
                max_tokens_per_page=1024
            )
            
            # Extract results - search.results is a list of result objects
            # Each result has: title, url, snippet, date, last_updated
            if not search.results:
                raise ValueError("No results returned from Perplexity Search API")
            
            # Format results with verified URLs
            formatted_results = []
            formatted_results.append(f"=== Search Results for: {query} ===\n")
            
            formatted_results.append("\n=== VERIFIED CITATIONS (Use ONLY these URLs) ===\n")
            for i, result in enumerate(search.results[:max_results], 1):
                # Access attributes directly as per SDK docs
                title = result.title
                url = result.url
                snippet = result.snippet if hasattr(result, 'snippet') else ''
                date = result.date if hasattr(result, 'date') else ''
                
                if url:
                    formatted_results.append(f"{i}. [{title}]({url})")
                    if snippet:
                        # Take first 200 chars of snippet
                        snippet_preview = snippet[:200] + "..." if len(snippet) > 200 else snippet
                        formatted_results.append(f"   Description: {snippet_preview}")
                    if date:
                        formatted_results.append(f"   Date: {date}")
                    formatted_results.append("")
            
            formatted_results.append("\n=== IMPORTANT: Only use URLs from VERIFIED CITATIONS above ===\n")
            formatted_results.append("Do NOT invent or make up URLs. Use only the URLs provided in citations.")
            
            return "\n".join(formatted_results)
            
        except Exception as e:
            raise Exception(f"Perplexity search failed: {str(e)}")


class ScraperTool:
    """Scraper tool for MIT OpenCourseWare and other trusted sources"""
    
    def __init__(self):
        self.trusted_sources = {
            "mit": "https://ocw.mit.edu/search/?q=",
            "coursera": "https://www.coursera.org/search?query=",
            "edx": "https://www.edx.org/search?q=",
            "freecodecamp": "https://www.freecodecamp.org/news/search/?query=",
            "codecademy": "https://www.codecademy.com/search?query=",
            "geeksforgeeks": "https://www.geeksforgeeks.org/page/1/?s=",
        }
    
    def run(self, query: str, max_results: int = 3) -> str:
        """Scrape content from trusted sources"""
        results = []
        
        # Focus on MIT OpenCourseWare
        try:
            mit_results = self._scrape_mit_ocw(query)
            if mit_results:
                results.append(f"MIT OpenCourseWare Results:\n{mit_results}")
        except Exception as e:
            results.append(f"MIT OpenCourseWare scraping failed: {str(e)}")
        
        # Scrape other sources
        for source_name, base_url in self.trusted_sources.items():
            if source_name == "mit":
                continue  # Already handled
            
            try:
                source_results = self._scrape_generic(base_url, query)
                if source_results:
                    results.append(f"{source_name.upper()} Results:\n{source_results}")
            except Exception as e:
                continue  # Skip failed sources
        
        return "\n\n".join(results) if results else "No results found from trusted sources."
    
    def _scrape_mit_ocw(self, query: str) -> str:
        """Scrape MIT OpenCourseWare"""
        try:
            search_url = f"https://ocw.mit.edu/search/?q={query.replace(' ', '+')}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            response = requests.get(search_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract course information
            courses = []
            course_elements = soup.find_all(['div', 'article'], class_=lambda x: x and ('course' in x.lower() or 'result' in x.lower()))[:5]
            
            for element in course_elements:
                title_elem = element.find(['h1', 'h2', 'h3', 'a'])
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    link = title_elem.get('href', '') if title_elem.name == 'a' else element.find('a', href=True)
                    if link and isinstance(link, dict):
                        link = link.get('href', '')
                    elif hasattr(link, 'get'):
                        link = link.get('href', '')
                    else:
                        link = str(link) if link else ''
                    
                    desc_elem = element.find(['p', 'div'], class_=lambda x: x and 'description' in x.lower() if x else False)
                    description = desc_elem.get_text(strip=True)[:200] if desc_elem else ""
                    
                    courses.append(f"- {title}\n  {description}\n  Link: {link}")
            
            if not courses:
                # Fallback: extract any meaningful text
                text_content = soup.get_text()[:1000]
                return f"Found content related to '{query}':\n{text_content}"
            
            return "\n\n".join(courses)
            
        except Exception as e:
            return f"Error scraping MIT OCW: {str(e)}"
    
    def _scrape_generic(self, base_url: str, query: str) -> str:
        """Generic scraper for other sources"""
        try:
            search_url = f"{base_url}{query.replace(' ', '+')}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            response = requests.get(search_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract main content
            main_content = soup.find('main') or soup.find('article') or soup.find('body')
            if main_content:
                text = main_content.get_text(strip=True)[:1000]
                return text
            
            return ""
            
        except Exception as e:
            return ""

