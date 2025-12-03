# OpenT Frontend

A beautiful, modern UI for the OpenT learning platform built with Next.js, Convex, and Shadcn UI.

## Features

- 🎨 Beautiful, study-focused UI with dark mode support
- 📊 Interactive roadmap flowcharts
- 📝 Markdown content renderer with LaTeX math support
- 🃏 Flashcard viewer with 3D flip animations
- ❓ Interactive quiz viewer with results
- 📚 RAG document management
- ⚡ Real-time updates with Convex
- 🎭 Smooth animations and transitions

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Add your Convex deployment URL to `.env.local`:
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Convex** - Real-time backend
- **Shadcn UI** - Beautiful component library
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Flow** - Flowchart visualization
- **React Markdown** - Markdown rendering
- **KaTeX** - LaTeX math rendering

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard (workspace list)
│   └── workspace/         # Workspace pages
│       └── [id]/          # Workspace detail
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── workspace/        # Workspace components
│   ├── roadmap/          # Roadmap components
│   ├── content/          # Content components
│   ├── flashcard/        # Flashcard components
│   └── quiz/             # Quiz components
└── lib/                  # Utilities
    └── convex/           # Convex client setup
```

## Color Palette

The UI uses a study-focused color palette (no purple):

- **Primary**: Blue (#2563eb)
- **Secondary**: Green (#059669)
- **Accent**: Red (#dc2626)
- **Background**: Slate (#f8fafc light / #0f172a dark)

## Development

- Run `pnpm dev` to start the development server
- Run `pnpm build` to build for production
- Run `pnpm start` to start the production server
