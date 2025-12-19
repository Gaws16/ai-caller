# CLAUDE.md

## User Rules:

1.Always when you create or update pages make them with a good looking professional UI/UX from a designer point of view.
2.Always show me at the end of the message what queries to enter in "SQL Editor" in Supabase if the project uses Supabase
3.Always add all "if conditions" in order cover all error cases. Always make a proper error handling.
4.Always when you add/remove/update something in Supabase update all my local schema as well "database-schema.sql" and my local migrations folder migrations as well.
5.Always when you create or edit a file/files add a comment at line 1 inside the code about the file/files location. For example: // frontend\src\router\index.js or <!-- pages/analytics/index.vue -->
6.Always use "" syntax instead of ''.
7.Always add console.logs everywhere. Always add advanced console logs in order to see full information and full request and response.
8.Always give me Windows commands
9.Always give me PowerShell commands
10.Never use browser alerts и confirm dialogs ("alert() and confirm()) to display a message,use toast or modals instead.
11.Always ensure fully fluid responsiveness down to 320px width, supporting legacy iPhone SE/Android mini devices
12.Always tell me how to test in details,before the action what i need to see in database tables/columns and after the action what i need to see in database tables/columns.
13.Always test my HTTP Endpoints with Curl to make sure they are working. Open PowerShell or terminal and test: get,post,put and delete server endpoints HTTP requests.
14.Always check with Supabase MCP/database-schema.sql local schema what tables and columns are used in Supabase. Never code blindly without checking with Supabase MCP.
15.Always before you implement something show me to confirm the Directory Structure that you plan to implement.
16.Always tell me before we start implementing something:
What is good practice, what is easier to implement, and what are my options here.
17.Use Github CLI to see what PR changes are made and what files are changed.
18.Always when you implement something use Context7 MCP to get the latest documentation available for the specific subject.

---

# .clinerules

## Project Context

This is VoiceVerify - an AI-powered order confirmation system.

**CRITICAL**: Always refer to docs/PRD.md, docs/TECH_STACK.md, and docs/PROJECT_PLAN.md before making ANY decisions or writing code.

## Tech Stack (MUST FOLLOW - NO EXCEPTIONS)

- Next.js 14+ (App Router) - TypeScript strict mode
- shadcn/ui components + Tailwind CSS
- Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- Stripe (Payment Intents with manual capture)
- Twilio Voice API
- Claude API (Anthropic Sonnet 4)
- ElevenLabs TTS
- Resend (email)

## Key Architectural Rules (READ BEFORE CODING)

1. Payment Intent MUST use capture_method: 'manual'
2. Payment flow: Authorize → Call → Capture (if confirmed) OR Cancel (if cancelled)
3. ALL external webhooks (Stripe, Twilio) → Supabase Edge Functions
4. Next.js API routes ONLY for internal application logic
5. Use Supabase Realtime subscriptions for admin UI updates
6. RETRY_DELAY_MINUTES is configurable (default 120, set to 5 for testing)
7. English only for MVP

## File Organization

- /app - Next.js App Router (pages, layouts, API routes)
- /components/ui - shadcn/ui components (copy-paste, not npm)
- /lib - Utilities (supabase client, stripe client, email)
- /supabase/functions - Edge Functions (stripe-webhook, call-handler, etc.)
- /supabase/migrations - Database schema SQL files

## Required Reading Before Implementation

**ALWAYS read these FIRST before implementing ANY feature:**

1. docs/AI_Caller_Bot_PRD.md - Complete product requirements (Payment Intent flow, state machine)
2. docs/TECH_STACK.md - Technology patterns, package.json, configuration
3. docs/PROJECT_PLAN.md - Phase-by-phase implementation guide

## Development Workflow

1. Read relevant documentation sections FIRST
2. Follow the EXACT tech stack specified (no substitutions)
3. Write TypeScript with strict mode enabled
4. Test locally with Stripe CLI and ngrok
5. Verify webhook signatures (Stripe + Twilio)
6. Use idempotent webhook handling (stripe_event_id)
7. Ask for clarification if ANYTHING conflicts with PRD

## Code Style Rules

- Use async/await (never .then)
- Prefer Server Components (use 'use client' sparingly)
- Follow Next.js 14 App Router patterns
- Use Zod for all validation
- Use React Hook Form for forms
- Use cn() utility for className merging
- Never hardcode API keys (use env variables)

## Database Rules

- Use Supabase migrations (never manual SQL in UI)
- All foreign keys with ON DELETE CASCADE
- All timestamps: TIMESTAMP WITH TIME ZONE
- Use JSONB for flexible data (responses, items)
- Enable Row Level Security (RLS)

## Webhook Rules

- ALWAYS verify signatures (Stripe + Twilio)
- ALWAYS check idempotency (stripe_event_id)
- ALWAYS return 200 OK quickly (don't timeout)
- Handle retries gracefully
- Log all webhook events

## When Stuck

1. Re-read the relevant section of PRD.md
2. Check TECH_STACK.md for examples
3. Check PROJECT_PLAN.md for phase order
4. Ask for clarification (don't guess)
   This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a Next.js 16 project using the App Router pattern with TypeScript and Tailwind CSS 4.

### Project Structure

- `app/` - App Router pages and layouts
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Home page
  - `globals.css` - Global styles and Tailwind imports
- `public/` - Static assets

### Key Technologies

- **Next.js 16** with App Router
- **React 19**
- **TypeScript** with strict mode
- **Tailwind CSS 4** via PostCSS

### Path Aliases

`@/*` maps to the project root (configured in tsconfig.json).

---

## NEXT.JS Good Practice RULES:

You are a Senior Front-End Developer and an Expert in ReactJS, NextJS, JavaScript, TypeScript, HTML, CSS and modern UI/UX frameworks (e.g., TailwindCSS, Shadcn). You are thoughtful, give nuanced answers, and are brilliant at reasoning. You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning.

- Follow the user"s requirements carefully & to the letter.
- First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.
- Confirm, then write code!
- Always write correct, best practice, DRY principle (Don"t Repeat Yourself), bug free, fully functional and working code also it should be aligned to listed rules down below at Code Implementation Guidelines.
- Focus on easy and readability code, over being performant.
- Fully implement all requested functionality.
- Leave NO todo"s, placeholders or missing pieces.
- Ensure code is complete! Verify thoroughly finalised.
- Include all required imports, and ensure proper naming of key components.
- Be concise. Minimize any other prose.
- If you think there might not be a correct answer, you say so.
- If you do not know the answer, say so, instead of guessing.

### Coding Environment

The user asks questions about the following coding languages:

- ReactJS
- NextJS
- JavaScript
- TypeScript
- TailwindCSS
- HTML
- CSS

### Code Implementation Guidelines

Follow these rules when you write code:

- Use early returns whenever possible to make the code more readable.
- Always use Tailwind classes for styling HTML elements; avoid using separate CSS files when possible.
- Use conditional rendering with ternary operators or logical AND (&&) for dynamic className values.
  Example: `className={isActive ? "bg-blue-500" : "bg-gray-500"}`
- Use descriptive variable and function/const names. Event handlers should be named with a "handle" prefix, like "handleClick" for onClick and "handleKeyDown" for onKeyDown.
- Implement accessibility features on interactive elements:
  - Add tabIndex={0} for keyboard navigation
  - Add aria-label for screen readers
  - Add onClick handlers with corresponding onKeyDown handlers for keyboard support
  - Use semantic HTML elements (button, nav, main, article, section, etc.)
- Prefer const arrow functions for components and handlers: `const ComponentName = () => {}`
- Define TypeScript types/interfaces for all props, state, and function parameters.

This comprehensive guide outlines best practices, conventions, and standards for development with modern web technologies including ReactJS, NextJS, TypeScript, JavaScript, HTML, CSS, and UI frameworks.

### Development Philosophy

- Write clean, maintainable, and scalable code
- Follow SOLID principles
- Prefer functional and declarative programming patterns over imperative
- Emphasize type safety and static analysis
- Practice component-driven development

### Code Implementation Guidelines

**Planning Phase**

- Begin with step-by-step planning
- Write detailed pseudocode before implementation
- Document component architecture and data flow
- Consider edge cases and error scenarios

**Code Style**

- Use 2 spaces for indentation (standard for Next.js/TypeScript projects)
- Use double quotes for strings (as per CLAUDE.md rule 11)
- Omit semicolons (unless required for disambiguation)
- Eliminate unused variables and imports
- Add space after keywords
- Add space before function declaration parentheses
- Always use strict equality (===) instead of loose equality (==)
- Space infix operators
- Add space after commas
- Keep else statements on the same line as closing curly braces
- Use curly braces for multi-line if statements
- Always handle error parameters in callbacks
- Limit line length to 100-120 characters (modern standard)
- Use trailing commas in multiline object/array literals

### React Best Practices

**Component Architecture**

- Use functional components with TypeScript interfaces
- Prefer const arrow functions: `const MyComponent = () => {}`
- Extract reusable logic into custom hooks
- Implement proper component composition
- Use React.memo() strategically for performance
- Implement proper cleanup in useEffect hooks
- Keep components small and focused (single responsibility)

**React Performance Optimization**

- Use useCallback for memoizing callback functions
- Implement useMemo for expensive computations
- Avoid inline function definitions in JSX props
- Implement code splitting using dynamic imports and React.lazy()
- Implement proper key props in lists (avoid using index as key)
- Use React DevTools Profiler to identify performance bottlenecks

### Next.js Best Practices

**Core Concepts (Next.js 14+ App Router)**

- Utilize App Router for routing (app/ directory)
- Implement proper metadata using Metadata API (NOT Head component):
  ```typescript
  export const metadata: Metadata = {
    title: "Page Title",
    description: "Page description",
  };
  ```
- Use proper caching strategies (revalidate, no-store, force-cache)
- Implement proper error boundaries using error.tsx files
- Use loading.tsx for loading states
- Implement proper route handlers in route.ts files

**Components and Features**

- Use Next.js built-in components:
  - Image component for optimized images (with proper width, height, alt)
  - Link component for client-side navigation
  - Script component for external scripts
- Implement proper loading states with Suspense boundaries
- Use proper data fetching methods:
  - Server Components for data fetching by default
  - Client Components only when needed (interactivity, browser APIs)
  - Server Actions for mutations

**Server Components (Default)**

- Default to Server Components for all components
- Use URL query parameters (searchParams) for data fetching and server state management
- Fetch data directly in Server Components (no need for useEffect)
- Use "use client" directive ONLY when necessary:
  - Event listeners (onClick, onChange, etc.)
  - Browser APIs (localStorage, window, document)
  - State management (useState, useReducer, useContext)
  - Effects (useEffect, useLayoutEffect)
  - Client-side-only libraries

**Client Components**

- Mark with "use client" directive at top of file
- Keep client components as small as possible
- Avoid fetching data in Client Components when possible
- Use React hooks (useState, useEffect, etc.)

### TypeScript Implementation

- Enable strict mode in tsconfig.json
- Define clear interfaces for component props, state, and API responses
- Use type guards to handle potential undefined or null values safely
- Apply generics to functions and components where type flexibility is needed
- Utilize TypeScript utility types (Partial, Pick, Omit, Record) for cleaner and reusable code
- Prefer interface over type for defining object structures, especially when extending
- Use mapped types for creating variations of existing types dynamically
- Avoid using "any" type - use "unknown" if type is truly unknown
- Use discriminated unions for complex state machines
- Leverage TypeScript"s inference - don"t over-annotate

### UI and Styling

**Component Libraries**

- Use Shadcn UI for consistent, accessible component design
- Integrate Radix UI primitives for customizable, accessible UI elements
- Apply composition patterns to create modular, reusable components
- Follow the shadcn/ui pattern: copy components into your codebase (not npm package)

**Styling Guidelines**

- Use Tailwind CSS for utility-first, maintainable styling
- Design with mobile-first, responsive principles for flexibility across devices
- Use Tailwind"s responsive prefixes (sm:, md:, lg:, xl:, 2xl:)
- Implement dark mode using Tailwind"s dark mode features (class or media strategy)
- Ensure color contrast ratios meet WCAG AA standards for accessibility
- Maintain consistent spacing values using Tailwind"s spacing scale
- Define CSS variables for theme colors and spacing in globals.css:
  ```css
  @layer base {
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
    }
  }
  ```
- Use cn() utility (from lib/utils) for conditional className merging

### State Management

**Local State**

- Use useState for simple component-level state
- Implement useReducer for complex state with multiple sub-values
- Use useContext for shared state between components (avoid prop drilling)
- Implement proper state initialization (lazy initialization for expensive computations)
- Keep state as close to where it"s used as possible

**Global State (if needed)**

- For simple global state, use React Context + useReducer
- For complex applications, consider Zustand (lightweight, modern state management)
- Consider React Server Components for server-side state management
- Avoid prop drilling by keeping global state minimal and using composition patterns

### Error Handling and Validation

**Form Validation**

- Use Zod for schema validation
- Implement proper error messages for user feedback
- Use React Hook Form for forms (integrates well with Zod)
- Validate on both client and server side
- Display validation errors inline near form fields

**Error Boundaries**

- Use error.tsx files in Next.js App Router for route-level error boundaries
- Implement global error boundary in app/error.tsx
- Use error boundaries to catch and handle errors in React component trees gracefully
- Log caught errors to an external service (e.g., Sentry, LogRocket) for tracking and debugging
- Design user-friendly fallback UIs to display when errors occur, keeping users informed
- Provide recovery actions (retry button, navigate back, etc.)

**Error Handling Patterns**

- Always handle async errors with try-catch blocks
- Use proper TypeScript error typing
- Return meaningful error messages to users
- Log errors for debugging but don"t expose sensitive information
- Handle network errors gracefully with retry mechanisms

### Performance Best Practices

- Use Next.js Image component for automatic image optimization
- Implement code splitting with dynamic imports
- Use Server Components to reduce client-side JavaScript
- Implement proper caching strategies
- Optimize bundle size with bundle analyzer
- Use loading states and skeleton screens
- Implement pagination or infinite scroll for large lists
- Debounce user input for search/filter operations
- Use web vitals monitoring

### Security Best Practices

- Never expose API keys or secrets in client-side code
- Use environment variables properly (.env.local for secrets)
- Validate and sanitize all user input
- Implement proper authentication and authorization
- Use HTTPS in production
- Implement CSRF protection for mutations
- Use Content Security Policy headers
- Sanitize HTML to prevent XSS attacks

### Deployment and Production

- Use environment variables for configuration
- Implement proper logging and monitoring
- Use Next.js built-in analytics or integrate third-party
- Optimize for Core Web Vitals
- Implement proper SEO with metadata
- Use CDN for static assets
- Implement proper caching headers
- Monitor errors and performance in production
