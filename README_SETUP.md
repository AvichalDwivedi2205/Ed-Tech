# OpenT - Complete Setup Guide

## Architecture Overview

This application uses:
- **Frontend**: Next.js 14 with Clerk auth, Convex database, Shadcn UI
- **Backend**: FastAPI microservices for AI agents
- **Auth**: Clerk (Google OAuth only)
- **Database**: Convex (workspaces, roadmaps, content, embeddings, chat)
- **AI**: LangGraph agents for roadmap and content generation
- **RAG**: Mini-Drona Q&A assistant with vector search

## Prerequisites

1. Python 3.8+
2. Node.js 18+
3. Clerk account (https://clerk.com)
4. Convex account (https://convex.dev)
5. Google API key (for Gemini and embeddings)
6. Perplexity API key (for web search)

## Setup Instructions

### 1. Backend Setup

```bash
cd /home/avich/openT
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` file in project root:
```bash
# AI APIs
GOOGLE_API_KEY=your_google_api_key  # For Gemini and embeddings (text-embedding-004)
PERPLEXITY_API_KEY=your_perplexity_api_key
TAVILY_API_KEY=your_tavily_api_key  # Optional

# Clerk
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=your_deploy_key
```

Start backend:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local` file:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Initialize Convex:
```bash
npx convex dev
```

This will:
1. Create a Convex project (if needed)
2. Deploy the schema
3. Generate TypeScript types
4. Start the Convex dev server

Start frontend:
```bash
npm run dev
```

### 3. Clerk Configuration

1. Go to https://dashboard.clerk.com
2. Create a new application
3. Enable Google OAuth provider only
4. Copy the publishable key and secret key
5. Add to `.env` and `.env.local`

### 4. Convex Configuration

1. Go to https://convex.dev
2. Create a new project
3. Run `npx convex dev` in the frontend directory
4. Copy the deployment URL to `.env` and `.env.local`
5. Get deploy key from Convex dashboard for backend

## Project Structure

```
openT/
├── backend/
│   ├── agents/          # LangGraph AI agents
│   ├── routers/         # FastAPI routes
│   ├── services/        # Business logic
│   ├── middleware/      # Clerk auth middleware
│   ├── utils/           # Convex client, etc.
│   └── main.py          # FastAPI app
├── frontend/
│   ├── app/             # Next.js 14 app router
│   │   ├── (auth)/      # Auth pages
│   │   └── (dashboard)/ # Protected pages
│   ├── components/      # React components
│   ├── convex/          # Convex functions & schema
│   └── lib/             # Utilities
└── requirements.txt     # Python dependencies
```

## Key Features

1. **Workspace Management**: Create and manage workspaces
2. **Roadmap Generation**: AI-powered learning roadmap creation
3. **Content Generation**: Generate educational content, quizzes, and graphs
4. **Mini-Drona**: RAG-based Q&A assistant for workspace content
5. **Vector Search**: Automatic embedding generation for RAG

## API Endpoints

### Roadmap
- `POST /api/v1/roadmap/generate` - Generate roadmap
- `POST /api/v1/roadmap/clarify` - Continue clarification
- `GET /api/v1/roadmap/status/{session_id}` - Get status

### Content
- `POST /api/v1/content/generate` - Generate content
- `GET /api/v1/content/progress/{task_id}` - Get progress

### Q&A (Mini-Drona)
- `POST /api/v1/qa/ask` - Ask a question
- `GET /api/v1/qa/history/{workspace_id}` - Get chat history

All endpoints require Clerk JWT token in Authorization header.

## Testing

1. Start backend: `uvicorn backend.main:app --reload`
2. Start frontend: `npm run dev` (in frontend/)
3. Start Convex: `npx convex dev` (in frontend/)
4. Visit http://localhost:3017
5. Sign in with Google
6. Create a workspace
7. Generate a roadmap
8. Generate content
9. Ask Mini-Drona questions

## Troubleshooting

- **Convex errors**: Make sure `npx convex dev` is running
- **Clerk auth errors**: Check API keys in `.env.local`
- **Graph not displaying**: Check that matplotlib is generating base64 images
- **Embeddings not working**: Verify Google API key is set (used for both Gemini and embeddings)

