# OpenT Agents - AI-Powered Learning Platform

A comprehensive AI-powered learning platform that generates personalized learning roadmaps and educational content using LangGraph-based agents.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [Usage](#usage)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Backend Test Results](#backend-test-results)
- [Project Structure](#project-structure)

---

## Architecture

- **Backend**: FastAPI with async endpoints
- **Frontend**: Next.js 14 with TypeScript, Shadcn UI, and Tailwind CSS
- **Agents**: Roadmap Generator and Content Creator (LangGraph-based)
- **Streamlit App**: Testing interface for agents (optional)

---

## Quick Start

### Start Backend (Terminal 1)

```bash
cd /home/avich/openT
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will run on `http://localhost:8000`
API docs available at `http://localhost:8000/docs`

### Start Frontend (Terminal 2)

```bash
cd /home/avich/openT/frontend
npm run dev
```

Frontend will run on `http://localhost:3017`

### Start Streamlit App (Optional - Terminal 3)

```bash
cd /home/avich/openT
source venv/bin/activate
streamlit run streamlit/streamlit_app.py
```

---

## Setup Instructions

### Prerequisites

- Python 3.8+ with pip
- Node.js 18+ with npm
- API Keys: `GOOGLE_API_KEY`, `PERPLEXITY_API_KEY` (TAVILY_API_KEY optional)

### Backend Setup

1. **Navigate to project root:**
   ```bash
   cd /home/avich/openT
   ```

2. **Create virtual environment (if not exists):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the project root:
   ```bash
   GOOGLE_API_KEY=your_google_api_key
   PERPLEXITY_API_KEY=your_perplexity_api_key
   TAVILY_API_KEY=your_tavily_api_key  # Optional
   ```

5. **Run the backend server:**
   ```bash
   # Option 1: Using uvicorn directly (recommended)
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   
   # Option 2: Using Python module
   python -m backend.main
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional):**
   Create `.env.local` file:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
   (Defaults to `http://localhost:8000/api/v1` if not set)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3017`

---

## API Endpoints

### Base URL
- **Development**: `http://localhost:8000/api/v1`
- **API Documentation**: `http://localhost:8000/docs`

### Roadmap Generator

- **POST** `/api/v1/roadmap/generate` - Generate roadmap from user input
  - Request: `FormData` with `user_input`, optional `file`, `session_id`, `conversation_history`
  - Response: Roadmap JSON with actions and session info

- **POST** `/api/v1/roadmap/clarify` - Continue clarification conversation
  - Request: `{"user_response": str, "session_id": str}`
  - Response: Updated roadmap with next clarification or final roadmap

- **GET** `/api/v1/roadmap/status/{session_id}` - Get generation status
  - Response: Status, progress, and actions

### Content Creator

- **POST** `/api/v1/content/generate` - Generate content for a subtopic
  - Request: `{"roadmap_json": dict, "subtopic_id": Optional[str]}`
  - Response: Generated content, quiz, graphs, and actions

- **GET** `/api/v1/content/progress/{task_id}` - Get content generation progress
  - Response: Status, progress percentage, current step, and actions

- **GET** `/api/v1/content/completed` - Get list of completed subtopics
  - Response: List of completed subtopic IDs and context summary

- **POST** `/api/v1/content/reset-context` - Reset context manager
  - Response: Success status

- **POST** `/api/v1/content/mega-quiz` - Generate mega quiz covering all subtopics
  - Response: Quiz questions covering all completed subtopics

### Health & Info

- **GET** `/health` - Health check endpoint
- **GET** `/` - API information and endpoint list
- **GET** `/docs` - Swagger UI documentation

---

## Features

### Backend Features

- ✅ Async operations for non-blocking requests
- ✅ File upload support (images, PDFs up to 10MB)
- ✅ Session management for multi-turn conversations
- ✅ Progress tracking for long-running operations
- ✅ Comprehensive error handling
- ✅ CORS configured for frontend
- ✅ Task manager for background operations
- ✅ Agent-based architecture with LangGraph

### Frontend Features

- ✅ Modern, responsive UI with Shadcn components
- ✅ Real-time progress updates via polling
- ✅ LaTeX equation rendering (react-katex)
- ✅ Markdown content rendering (react-markdown)
- ✅ Interactive quiz components with reveal answers
- ✅ File upload with drag-and-drop
- ✅ Graph visualization components
- ✅ Error handling and loading states
- ✅ Beautiful gradient designs

### Agent Features

- ✅ **Roadmap Generator**: Creates personalized learning roadmaps
  - OCR support for uploaded documents
  - Web search for latest resources
  - Multi-turn clarification conversations
  - Structured JSON output

- ✅ **Content Creator**: Generates comprehensive educational content
  - Stepwise content generation per subtopic
  - Automatic quiz generation
  - Graph/chart generation
  - Context management across subtopics
  - LaTeX equation support

---

## Usage

### 1. Generate a Roadmap

**Via Frontend:**
1. Visit `http://localhost:3017/roadmap`
2. Upload a document (optional) or describe your learning goals
3. Chat with the AI to generate your roadmap
4. Answer clarification questions (up to 3)
5. Download the roadmap JSON

**Via API:**
```bash
curl -X POST "http://localhost:8000/api/v1/roadmap/generate" \
  -F "user_input=I want to learn machine learning" \
  -F "session_id=my-session-123"
```

### 2. Generate Content

**Via Frontend:**
1. Visit `http://localhost:3017/content`
2. Upload the roadmap JSON file
3. Click "Generate Content" for each subtopic
4. View generated content, quizzes, and graphs
5. Download content and quiz files

**Via API:**
```bash
curl -X POST "http://localhost:8000/api/v1/content/generate" \
  -H "Content-Type: application/json" \
  -d '{"roadmap_json": {...}, "subtopic_id": "Subtopic1"}'
```

### 3. Test with Streamlit (Optional)

```bash
streamlit run streamlit/streamlit_app.py
```

Access at `http://localhost:8501`

---

## Development

### Backend Development

- **API Documentation**: Available at `http://localhost:8000/docs`
- **Code Structure**: 
  - `backend/agents/` - All agent implementations
  - `backend/services/` - Service layer
  - `backend/routers/` - API routes
  - `backend/models/` - Pydantic schemas
  - `backend/utils/` - Utility functions

- **Key Technologies**:
  - FastAPI for async API
  - LangGraph for agent workflows
  - LangChain for LLM integration
  - Pydantic for validation

### Frontend Development

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Zustand

### Project Structure

```
openT/
├── backend/                  # FastAPI Backend
│   ├── agents/              # All agents and tools
│   │   ├── roadmap_agent.py
│   │   ├── content_agent.py
│   │   ├── quiz_generator.py
│   │   ├── graph_generator.py
│   │   ├── tools.py
│   │   ├── content_tools.py
│   │   ├── content_research.py
│   │   └── content_context.py
│   ├── services/            # Service layer
│   ├── routers/             # API routes
│   ├── models/              # Pydantic schemas
│   ├── utils/               # Utilities
│   └── main.py              # FastAPI app
├── frontend/                 # Next.js Frontend
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   └── lib/                 # Utilities
├── streamlit/               # Streamlit testing app
│   ├── streamlit_app.py
│   └── streamlit_pages/
└── requirements.txt         # Python dependencies
```

---

## Environment Variables

### Backend

Required:
- `GOOGLE_API_KEY` - For Gemini models (required)
- `PERPLEXITY_API_KEY` - For web search (required)

Optional:
- `TAVILY_API_KEY` - For additional search capabilities

### Frontend

Optional:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:8000/api/v1`)

---

## Troubleshooting

### Backend Issues

**Backend not starting:**
- Check API keys are set in `.env` file
- Verify Python dependencies are installed: `pip install -r requirements.txt`
- Check for port conflicts (default port: 8000)
- Verify virtual environment is activated

**Import errors:**
- Ensure you're in the project root directory
- Activate virtual environment: `source venv/bin/activate`
- Check that `backend/agents/` directory exists

**Agent initialization fails:**
- Verify `GOOGLE_API_KEY` is set correctly
- Check API key permissions and quotas
- Run test: `python test_tools.py`

### Frontend Issues

**Frontend can't connect to backend:**
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local` matches backend URL
- Verify CORS is configured in backend (default: localhost:3000, localhost:3001)

**Build errors:**
- Run `npm install` to ensure all dependencies are installed
- Clear `.next` directory: `rm -rf .next`
- Check Node.js version (requires 18+)

**Component errors:**
- Verify Shadcn components are installed
- Check Tailwind CSS configuration
- Clear browser cache

### Content Generation Issues

**Content truncated:**
- Model is set to `gemini-2.5-flash` by default
- Check API quotas/limits
- Verify content length validation (warns if < 2000 chars)
- Check error messages in response

**Tools not working:**
- Verify API keys are set correctly
- Run test script: `python test_tools.py`
- Check network connectivity
- Verify API key permissions

**Generation fails:**
- Check error details in API response
- Verify roadmap JSON is valid
- Check API key permissions
- Review agent logs

---

## Backend Test Results

### Server Status
✅ **Server Running**: http://127.0.0.1:8000  
✅ **Health Check**: PASSED  
✅ **OpenAPI Schema**: 10 endpoints defined

### Endpoint Test Results

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/` | GET | ✅ | Root endpoint working |
| `/health` | GET | ✅ | Health check working |
| `/docs` | GET | ✅ | Swagger UI available |
| `/api/v1/roadmap/generate` | POST | ✅ | Roadmap generation working |
| `/api/v1/roadmap/clarify` | POST | ✅ | Multi-turn conversation working |
| `/api/v1/roadmap/status/{id}` | GET | ✅ | Status endpoint working |
| `/api/v1/content/generate` | POST | ✅ | Content generation working |
| `/api/v1/content/progress/{id}` | GET | ✅ | Progress tracking working |
| `/api/v1/content/completed` | GET | ✅ | Completed subtopics endpoint working |
| `/api/v1/content/reset-context` | POST | ✅ | Context reset working |
| `/api/v1/content/mega-quiz` | POST | ✅ | Mega quiz endpoint working |

### Key Features Verified

✅ **Async Operations**: All endpoints respond asynchronously  
✅ **Error Handling**: Proper error responses with appropriate status codes  
✅ **Session Management**: Multi-turn conversations maintained correctly  
✅ **Progress Tracking**: Task manager working for content generation  
✅ **File Upload Support**: Endpoint accepts file uploads  
✅ **CORS Configuration**: CORS middleware configured for frontend  
✅ **Agent Integration**: Agents import and initialize correctly  
✅ **Context Management**: Context manager working for content generation  

---

## Project Structure

### Backend Agents Module

All agents are located in `backend/agents/`:

```
backend/agents/
├── __init__.py              # Module exports
├── roadmap_agent.py         # RoadmapGeneratorAgent
├── content_agent.py         # ContentCreatorAgent
├── quiz_generator.py        # QuizGenerator sub-agent
├── graph_generator.py       # GraphGeneratorAgent sub-agent
├── tools.py                 # Roadmap tools (OCR, Perplexity, Scraper)
├── content_tools.py         # Content tools (LaTeX, Graph, Formatter)
├── content_research.py      # Content research tools (Tavily, ContentResearch)
└── content_context.py       # ContextManager for maintaining state
```

**Usage:**
```python
from backend.agents import (
    RoadmapGeneratorAgent,
    ContentCreatorAgent,
    QuizGenerator,
    GraphGeneratorAgent,
    # ... all tools
)
```

### File Paths

- `content_context.json` - Stored in `backend/` directory
- `generated_content/` - Created in `backend/` directory
  - Contains generated content, quizzes, and graphs per subtopic

---

## What to Expect

### Roadmap Generation Process

1. User provides learning goal or uploads document
2. Agent asks clarification questions (up to 3)
3. Agent searches web for latest resources
4. Agent scrapes trusted sources (MIT OCW, etc.)
5. Agent generates structured roadmap JSON

### Content Generation Process

1. Upload roadmap JSON
2. Agent loads roadmap and context
3. Agent researches content from trusted sources
4. Agent generates comprehensive content
5. Agent generates graphs/charts
6. Agent generates quiz questions
7. Agent saves context for next subtopic

### Generated Content Includes

- **Comprehensive text** (>2000 characters typically)
- **LaTeX equations** (displayed with `$$...$$` for display, `$...$` for inline)
- **Solved examples** (2-3 per topic with step-by-step solutions)
- **Video links** (from Perplexity search)
- **Article links** (from Perplexity search)
- **Graphs/charts** (Python matplotlib code)
- **Quiz questions** (5 questions per subtopic with multiple types)

---

## Model Options

The default model is `gemini-2.5-flash` for fast and efficient generation.

Available models:
- `gemini-2.5-flash` - Fast and efficient (default)
- `gemini-1.5-pro` - Best quality, longer outputs (slower)
- `gemini-2.0-flash-exp` - Fast, good quality

To change model, edit agent initialization in `backend/agents/`.

---

## Production Notes

### Current Limitations

- Backend uses in-memory task management (not suitable for production scaling)
- File uploads are limited to 10MB by default
- CORS is configured for localhost:3000 by default
- Session state is stored in memory

### Production Recommendations

- Use proper task queue (Redis/Celery) instead of in-memory task manager
- Set up proper session storage (Redis/Database)
- Configure HTTPS
- Set up proper logging and monitoring
- Use environment-specific configurations
- Implement authentication/authorization
- Add rate limiting
- Use proper database for context storage
- Set up CI/CD pipeline

---

## Testing

### Test Tools

```bash
# Activate virtual environment first
source venv/bin/activate
python test_tools.py
```

This will test:
- Perplexity Search Tool
- Scraper Tool (MIT OCW)
- Tavily Search Tool (optional)
- Content Research Tool

### Test Backend Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Generate roadmap
curl -X POST "http://localhost:8000/api/v1/roadmap/generate" \
  -F "user_input=I want to learn Python"

# Get completed subtopics
curl http://localhost:8000/api/v1/content/completed
```

---

## Additional Resources

- **API Documentation**: http://localhost:8000/docs (when server is running)
- **OpenAPI Schema**: http://localhost:8000/openapi.json
- **Frontend**: http://localhost:3017
- **Streamlit App**: http://localhost:8501 (when running)

---

## License

This project is part of the OpenT learning platform.

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review API documentation at `/docs`
3. Check error messages in API responses
4. Verify environment variables are set correctly

