# 🎃 Haunted Codebase 👻

**A Resurrection of Classic Text Adventures with Modern AI**

Haunted Codebase brings the classic text-based adventure games of the 1970s-80s (like Zork, Colossal Cave Adventure) back to life with modern AI-powered dynamic storytelling. Experience procedurally generated horror stories where every playthrough is unique, powered by AI that adapts to your choices.

## 🎮 Category

**Primary:** Resurrection - Bringing dead technology (text-based adventure games) back to life  
**Bonus:** Costume Contest - Spooky, polished UI that enhances the experience

## ✨ Features

- **AI-Powered Story Generation**: Dynamic, branching narratives that adapt to player choices
- **Classic Text Adventure Mechanics**: Inventory, exploration, puzzles, and multiple endings
- **Spooky Terminal Aesthetic**: Modern web UI with retro terminal charm
- **Procedural Horror**: Every playthrough generates a unique haunted story
- **Interactive Fiction**: Rich descriptions, atmospheric storytelling, and immersive gameplay

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Convex (serverless backend)
- **AI**: LangGraph agents with OpenRouter API (Gemini 2.5 Flash)
- **Styling**: Terminal-inspired UI with spooky animations

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your Convex deployment URL and API keys

# Run development server
pnpm dev
```

## 📁 Project Structure

```
haunted-codebase/
├── frontend/              # Next.js frontend
├── src/                   # Game engine and AI agents
├── convex/                # Convex backend
└── .kiro/                 # Kiro specs, hooks, and steering docs
```

## 🎯 How Kiro Was Used

This project extensively uses Kiro's features:

### Spec-Driven Development
- Complete game engine architecture defined in `.kiro/specs/`
- AI story generation system specified with clear requirements
- Frontend components structured via design specs

### Agent Hooks
- Automated story generation workflows
- Game state management hooks
- AI response processing pipelines

### Steering Documents
- Consistent AI storytelling style
- Horror genre guidelines
- Narrative structure patterns

### Vibe Coding
- Creative feature brainstorming
- UI/UX experimentation
- Story generation prompt engineering

### MCP Integration
- Extended capabilities for story generation
- Custom tools for game mechanics

## 📜 License

MIT License - See LICENSE file

## 🎃 Happy Haunting!

Enter if you dare... 👻
