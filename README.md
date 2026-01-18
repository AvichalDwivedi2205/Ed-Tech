# OpenT - AI-Powered Learning Platform

**An intelligent education technology platform that generates personalized learning experiences**

OpenT is a comprehensive AI-powered learning platform that creates personalized learning roadmaps, generates educational content, and provides interactive study materials including quizzes, flashcards, and research reports.

## 🎯 What is OpenT?

OpenT transforms the learning experience by leveraging AI to:
- Generate personalized learning roadmaps based on your goals and current knowledge
- Create comprehensive educational content with slide-based presentations
- Produce interactive quizzes and flashcards for effective studying
- Conduct deep research with citation-backed reports
- Support document-based learning through RAG (Retrieval-Augmented Generation)

## ✨ Key Features

### 🗺️ **Personalized Roadmap Generation**
- AI-driven learning path creation
- OCR support for extracting text from images and PDFs
- Clarification-based workflow for precision
- Web search integration for up-to-date content

### 📚 **Intelligent Content Creation**
- Slide-based educational content (theory, examples, exercises)
- RAG integration for document-based learning
- Web search for comprehensive coverage
- Multiple teaching styles support

### 🧠 **Study Tools**
- **Quizzes**: Multiple choice, true/false, and short answer questions
- **Flashcards**: Interactive flip cards for memorization
- **Notes**: AI-generated concise study notes

### 🔍 **Deep Research Agent**
- Multi-layered search strategy (Perplexity AI + Tavily + Web Scraping)
- Citation-backed markdown reports
- Normal and comprehensive research modes
- 20-80 sources per report

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4.x** for styling
- **Shadcn UI** components
- **React Flow** for roadmap visualization
- **KaTeX** for LaTeX math rendering
- **Framer Motion** for animations

### Backend
- **Convex** - Serverless backend with real-time database
- **Vector Search** for RAG capabilities
- **File Storage** for documents

### AI & Agents
- **LangGraph** for agent orchestration
- **LangChain** for LLM integration
- **Google Gemini 2.5 Flash** via OpenRouter
- **Perplexity AI** for contextual search
- **Tavily Search** for targeted fact-finding
- **Cheerio** for web scraping

## 🎯 How Kiro Was Used

This project was developed extensively using **Kiro's AI-assisted development features**. Here's how:

### 📋 Spec-Driven Development
The `.kiro/specs/` directory contains comprehensive design specifications for each feature:
- **Content Generation** (`content-generation/design.md`): Architecture for AI-powered slide-based content creation
- **Deep Research Agent** (`deep-research-agent/design.md`): Multi-layered search strategy and citation management
- **Quiz Generation** (`quiz-generation/design.md`): Interactive quiz creation from content
- **Flashcard Generation** (`flashcard-generation/design.md`): Spaced repetition flashcard system
- **Notes Generation** (`notes-generation/design.md`): Concise study note generation
- **Web Scraping Tools** (`web-scraping-tools/design.md`): Content extraction pipeline

Each spec defines:
- System architecture and data flow
- Component interfaces and schemas
- Testing strategies
- Performance optimizations

### 🎯 Steering Documents
The `.kiro/steering/` directory provides development guidelines and context:
- **Frontend Guidelines** (`frontend-guidelines.md`): Next.js 16, Tailwind 4.x patterns, Convex integration
- **Convex Integration** (`convex-integration.md`): Database schemas, query patterns, action patterns
- **Agent Development** (`agent-development.md`): LangGraph patterns, state management, search strategies
- **RAG Service** (`rag-service.md`): Document processing pipeline, vector search, chunk management
- **Tool Usage Patterns** (`tool-usage-patterns.md`): Common mistakes and best practices
- **Package Management** (`installed-packages.md`): Leveraging existing dependencies

### 🤖 AI-Assisted Development Workflow
1. **Specs First**: Each feature was defined in specs before implementation
2. **Steering Context**: Kiro used steering docs to maintain consistency across the codebase
3. **Iterative Refinement**: Specs were updated as requirements evolved
4. **Context Awareness**: Kiro understood the entire architecture through steering docs

### 🔄 Continuous Integration
- Specs act as living documentation
- Steering docs prevent common mistakes (e.g., strReplace without newStr)
- Context always available to maintain code quality

## 📁 Project Structure

```
Ed-Tech/
├── .kiro/                  # Kiro specs, steering docs
│   ├── specs/             # Feature design specifications
│   └── steering/          # Development guidelines
├── frontend/              # Next.js 16 frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── lib/              # Utilities
├── convex/               # Convex backend
│   ├── actions/          # Long-running operations
│   ├── mutations/        # Database writes
│   ├── queries/          # Database reads
│   └── schema.ts         # Database schema
└── src/                  # AI agents and tools
    ├── agents/           # LangGraph agents
    ├── tools/            # Search, OCR, scraping tools
    ├── services/         # RAG, embedding services
    └── types/            # TypeScript types
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Convex account ([convex.dev](https://convex.dev))
- API keys for:
  - OpenRouter (for Gemini 2.5 Flash)
  - Perplexity AI
  - Tavily Search
  - Google Cloud (for OCR)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/AvichalDwivedi2205/Ed-Tech.git
cd Ed-Tech
```

2. **Install dependencies**
```bash
# Frontend
cd frontend
pnpm install

# Backend setup
cd ..
pnpm install
```

3. **Set up environment variables**
```bash
# Create .env in root directory
cp .env.example .env
```

Add your API keys:
```env
OPENROUTER_API_KEY=your_openrouter_key
PERPLEXITY_API_KEY=your_perplexity_key
TAVILY_API_KEY=your_tavily_key
GOOGLE_API_KEY=your_google_key
```

4. **Deploy Convex backend**
```bash
npx convex dev
```

5. **Run frontend**
```bash
cd frontend
pnpm dev
```

6. **Open the app**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Creating a Workspace
1. Click "New Workspace" on the dashboard
2. Enter a name and description
3. Your workspace is ready!

### Generating a Roadmap
1. Open a workspace
2. Click "Generate Roadmap"
3. Answer clarification questions (if any)
4. AI generates a personalized learning path

### Creating Content
1. Select a topic from your roadmap
2. Click "Generate Content"
3. Toggle RAG (use workspace documents) or Web Search as needed
4. View slide-based educational content

### Study Tools
- **Quizzes**: Click "Generate Quiz" on any content
- **Flashcards**: Click "Generate Flashcards" for memorization
- **Notes**: Click "Generate Notes" for quick revision

### Deep Research
1. Go to Research tab
2. Enter your research query
3. Choose Normal (20-30 sources) or Comprehensive (70-80 sources)
4. Get a citation-backed markdown report

## 🧪 Testing

```bash
# Frontend tests
cd frontend
pnpm test

# Backend tests
npx convex test
```

## 📦 Deployment

### Frontend (Vercel)
See [`frontend/DEPLOYMENT.md`](frontend/DEPLOYMENT.md) for detailed deployment instructions.

### Backend (Convex)
```bash
npx convex deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add specs in `.kiro/specs/` for new features
4. Update steering docs in `.kiro/steering/` if needed
5. Implement the feature
6. Submit a pull request

## 📜 License

MIT License - See [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- **Kiro** - For enabling spec-driven AI-assisted development
- **Convex** - For the amazing serverless backend
- **LangGraph** - For powerful agent orchestration
- **OpenRouter** - For seamless LLM access

---

**Built with Kiro 🤖 | Powered by AI 🧠 | Made for Learning 📚**