# Changelog

All notable changes to the LeadSpark project.

## [1.1.0] - 2026-04-05

### Code Quality Improvements

#### TypeScript Strict Mode
- Added explicit return types to all React components and functions
- Fixed type-only imports for `verbatimModuleSyntax` compliance
- Replaced deprecated `substr()` with `substring()` method
- All chatbot files now pass strict type checking

#### Component Architecture
- **Refactored ChatWidget**: Decomposed monolithic 207-line component into smaller, focused components:
  - `ChatHeader` - Header UI with minimize/close controls
  - `LoadingIndicator` - Animated typing indicator
  - `EmptyState` - Placeholder for empty chat
  - `ToggleButton` - Floating action button
- Created `LazyChatWidget` for code-splitting support

#### Performance Optimizations
- Added `React.memo` to 5 components to prevent unnecessary re-renders:
  - `ChatMessage`
  - `ChatHeader`
  - `LoadingIndicator`
  - `EmptyState`
  - `ToggleButton`
- Implemented lazy loading support via `LazyChatWidget`
- All callbacks properly memoized with `useCallback`

#### Code Organization
- Created `constants.ts` with centralized configuration:
  - `TIMING` - All timeout and delay values
  - `UI` - Layout and dimension constants
  - `CHAT_STEPS` - Conversation flow steps
  - `ERROR_MESSAGES` - User-facing error messages
- Enhanced `types.ts` with comprehensive TypeScript interfaces
- Created barrel exports (`index.ts`) for clean imports

#### Error Handling
- Improved error logging with contextual messages
- Centralized error messages in constants
- Added structured error types for future API integration

#### Documentation
- Added JSDoc comments to all public functions
- Documented component props and usage examples
- Added inline comments explaining complex logic

#### Accessibility
- Added proper ARIA labels to all interactive elements
- Added `role` and `aria-modal` to dialog
- Added `aria-hidden` to decorative icons
- Improved screen reader support

### Files Added
- `src/components/chatbot/constants.ts`
- `src/components/chatbot/ChatHeader.tsx`
- `src/components/chatbot/LoadingIndicator.tsx`
- `src/components/chatbot/EmptyState.tsx`
- `src/components/chatbot/ToggleButton.tsx`
- `src/components/chatbot/LazyChatWidget.tsx`
- `src/components/chatbot/index.ts`
- `src/components/chatbot/hooks/index.ts`

### Files Modified
- `src/components/chatbot/types.ts` - Added new interfaces
- `src/components/chatbot/ChatWidget.tsx` - Major refactoring
- `src/components/chatbot/ChatMessage.tsx` - Added memo, JSDoc
- `src/components/chatbot/ChatInput.tsx` - Constants, explicit types
- `src/components/chatbot/hooks/useChat.ts` - Enhanced error handling
- `src/lib/prompts.ts` - Added JSDoc documentation

---

## [1.0.0] - Initial Release

### Features
- Landing page for healthcare professionals
- Responsive design with Tailwind CSS
- Dark mode support
- Chatbot widget for lead generation
- Contact form
- Services showcase
- Team section
- Testimonials

### Tech Stack
- Astro 4
- React 18
- TypeScript
- Tailwind CSS
- Node.js adapter
