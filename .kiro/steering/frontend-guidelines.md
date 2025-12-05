---
inclusion: always
---

# Frontend Development Guidelines

This document outlines the frontend development standards and best practices for OpenT.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: Version 19
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI primitives
- **State Management**: Convex React hooks
- **Markdown**: react-markdown with KaTeX and syntax highlighting

## Tailwind CSS 4.x

This project uses Tailwind CSS v4.x which has significant changes from previous versions.

### Key Features
- Utility-first CSS framework
- Dark mode support via `dark:` variant
- Responsive design with mobile-first approach
- Custom color palette: slate, blue, purple, indigo

### Common Patterns
```tsx
// Responsive classes
className="text-sm md:text-base lg:text-lg"

// Dark mode
className="bg-white dark:bg-slate-900"

// Hover states
className="hover:bg-slate-100 dark:hover:bg-slate-800"
```

## Component Structure

### Page Components
- Located in `frontend/app/`
- Use "use client" directive for client components
- Leverage Convex hooks for data fetching

### Reusable Components
- Located in `frontend/components/`
- Organized by feature/domain
- Export from index files when appropriate

### UI Primitives
- Located in `frontend/components/ui/`
- Based on Radix UI
- Follow shadcn/ui patterns

## Convex Integration

### Data Fetching
```tsx
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

const data = useQuery(api.queries.workspaces.listWorkspaces, {});
```

### Mutations
```tsx
import { useMutation } from "convex/react";

const createWorkspace = useMutation(api.mutations.workspaces.createWorkspace);
await createWorkspace({ name: "My Workspace" });
```

### Actions (Long-running operations)
```tsx
import { useAction } from "convex/react";

const generateReport = useAction(api.actions.deepResearch.startResearch);
const result = await generateReport({ query: "..." });
```

## Styling Guidelines

### Layout Patterns
- Use container classes for max-width
- Sidebar: Fixed left sidebar (hidden on mobile, visible on lg+)
- Main content: Offset with `lg:ml-64` when sidebar is present

### Card Components
- Use Card, CardHeader, CardTitle, CardContent from `@/components/ui/card`
- Consistent padding and spacing
- Shadow and border styling for depth

### Color Scheme
- Primary: Blue/Indigo gradients
- Research: Purple/Pink gradients
- Success: Green
- Error: Red
- Neutral: Slate grays

## Markdown Rendering

### Research Reports
- Use `ResearchReportViewer` component for research reports
- Beautiful typography with serif fonts
- Academic-style formatting
- Proper citation styling

### Content Pages
- Use `MarkdownRenderer` component for general content
- Supports LaTeX math (KaTeX)
- Code syntax highlighting
- Callout blocks

## Accessibility

- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation
- Maintain color contrast (WCAG AA)
- Test with screen readers

## Performance

- Use Next.js Image component for images
- Lazy load heavy components
- Optimize bundle size
- Use React.memo for expensive components
- Leverage Next.js caching strategies

## File Naming

- Components: PascalCase (e.g., `WorkspaceCard.tsx`)
- Pages: lowercase with hyphens (e.g., `deep-research/page.tsx`)
- Utilities: camelCase (e.g., `utils.ts`)
- Types: PascalCase (e.g., `types.ts`)

## Common Patterns

### Loading States
```tsx
if (data === undefined) {
  return <Skeleton />;
}
```

### Error States
```tsx
if (data === null) {
  return <ErrorMessage />;
}
```

### Empty States
```tsx
if (data.length === 0) {
  return <EmptyState />;
}
```
