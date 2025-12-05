# Implementation Plan

- [x] 1. Implement NotesGeneratorAgent
  - Create LangGraph state graph
  - Add note generation logic
  - Structure notes with sections
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create Convex actions and mutations
  - Create generateNotes action
  - Add notes mutations
  - Link notes to workspace and subtopic
  - _Requirements: 1.5, 1.6_

- [x] 3. Build notes viewer component
  - Create ShortNotesViewer component
  - Add markdown rendering
  - Implement editing interface
  - Add auto-save functionality
  - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Implement notes UI
  - Create note generation dialog
  - Add progress indicators
  - Display notes list
  - _Requirements: 1.1, 1.2_

- [x] 5. Add note editing
  - Implement markdown editor
  - Add auto-save
  - Track edit history
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 6. Write comprehensive tests
  - Unit tests for agent logic
  - Integration tests for generation flow
  - Feature tests for UI components
  - _Requirements: All requirements_

