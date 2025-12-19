# VoiceVerify - AI Copilot Instructions

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

## System Overview

VoiceVerify is an AI-powered voice calling system that confirms orders through automated phone calls. The critical innovation: **SetupIntent → AI Call Confirmation → Payment Capture** flow. Cards are validated but NOT charged until after phone confirmation.

## Architecture & Data Flow

### Critical Flow

1. Customer checkout → Create Stripe SetupIntent (saves card, NO charge)
2. `setup_intent.succeeded` webhook → Supabase Edge Function triggers call via Twilio
3. AI call handler (Gemini 2.0) conducts natural conversation
4. Call confirms → Create & capture PaymentIntent with saved card
5. Call cancels → Delete SetupIntent, no charge occurs

### Component Boundaries

- **Next.js API routes** (`app/api/*`): Internal app logic, order creation, Stripe customer management
- **Supabase Edge Functions** (`supabase/functions/*`): External webhooks (Stripe, Twilio), call orchestration
- **Edge Functions are Deno**: Use `npm:` imports, environment via `Deno.env.get()`, NOT Node.js

## Critical Patterns & Conventions

### Payment Flow (SetupIntent Pattern)

```typescript
// In app/api/orders/route.ts - ALWAYS follow this sequence:
1. Create Stripe Customer first (required for off-session)
2. Create SetupIntent with: usage: 'off_session', confirm: true
3. Store stripe_customer_id in orders table
4. SetupIntent success → webhook triggers call
5. After call confirms → create PaymentIntent with saved payment_method
```

**Never** use `capture_method: 'manual'` with PaymentIntent anymore. Use SetupIntent flow instead.

### Webhook Idempotency Pattern

All Stripe webhooks MUST check for duplicate processing:

```typescript
const { data: existing } = await supabase
  .from("payments")
  .eq("stripe_event_id", event.id)
  .single();
if (existing) return Response({ received: true, duplicate: true });
```

### AI Call State Machine

Conversation flow in `supabase/functions/call-handler/index.ts`:

- `ORDER_CONFIRMATION` → `QUANTITY_CONFIRMATION` → `PAYMENT_CONFIRMATION` → `ADDRESS_CONFIRMATION` → `DELIVERY_TIME` → `COMPLETE`
- Intent classification via Gemini 2.0 (`gemini-2.0-flash` model)
- Responses stored in `calls.responses` JSONB column
- State transitions in `call.current_step`

### Database Schema Key Points

- `orders` table: `payment_status` separate from order `status`
- `calls` table: `responses` JSONB stores conversation state, `outcome` is final result
- Foreign keys use `ON DELETE CASCADE` - deleting order removes calls/payments
- `stripe_customer_id` in orders table (migration 003) - critical for off-session payments
- `language` column (migration 004) - 'en' or 'bg' (i18n support via next-intl)

## Developer Workflows

### Local Development Setup

```powershell
# 1. Install dependencies
npm install

# 2. Set environment variables (see ENV_REFERENCE.md for full list)
# Create .env.local with Next.js vars
# For quick testing: DEV_BYPASS_AUTH=true (dev only!)

# 3. Start Supabase locally (optional)
supabase start

# 4. Push database migrations
supabase db push

# 5. Deploy Edge Functions
supabase functions deploy
supabase secrets set STRIPE_SECRET_KEY=sk_test_...  # Set all secrets

# 6. Start Next.js dev server
npm run dev  # http://localhost:3000
```

### Testing Webhooks Locally

```powershell
# Stripe webhooks → Supabase Edge Function
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Twilio webhooks → Use ngrok for local Edge Functions
ngrok http 54321
# Configure Twilio webhook: https://<ngrok-url>.ngrok.io/functions/v1/call-handler?call_id=<uuid>
```

### Database Migrations

**Always** update both when schema changes:

1. `supabase/migrations/*.sql` - versioned migration files
2. `database-schema.sql` - single source of truth (consolidated view)

Apply: `supabase db push` or `supabase db reset` (local)

### Testing Strategy

- See `docs/TESTING.md` for auth bypass options
- Use `DEV_BYPASS_AUTH=true` for dashboard access without login
- Test with Stripe test cards: `4242 4242 4242 4242` (requires 3D Secure setup)
- Twilio test credentials for call simulation

## Project-Specific Rules

### File Comments

ALWAYS add file path comment at line 1 (per user rules):

```typescript
// app/api/orders/route.ts
// or
<!-- components/checkout/checkout-form.tsx -->
```

### Console Logging

Add comprehensive logging everywhere for debugging:

```typescript
console.log("Full request:", JSON.stringify(request, null, 2));
console.log("Full response:", JSON.stringify(response, null, 2));
```

### Error Handling

ALWAYS cover all error cases with if conditions:

```typescript
if (!order) {
  return NextResponse.json({ error: "Order not found" }, { status: 404 });
}
if (orderError) {
  console.error("Order error:", orderError);
  return NextResponse.json(
    { error: "Database error", details: orderError.message },
    { status: 500 }
  );
}
```

### UI/UX Requirements

- Professional designer-level UI using shadcn/ui components
- Fully responsive down to 320px (legacy iPhone SE support)
- Use toast notifications or modals, **NEVER** `alert()` or `confirm()` dialogs
- Tailwind CSS for all styling (avoid separate CSS files)

### String Literals

Use double quotes `""` instead of single quotes `''` (per user preference)

### Platform Commands

Always provide **Windows PowerShell** commands, not bash/unix

## Integration Points

### Stripe Integration

- API version: `2024-12-18.acacia` (Edge Functions) or `2025-11-17.clover` (Next.js)
- Webhook signature verification REQUIRED in production
- Test mode: `sk_test_*` keys, live mode: `sk_live_*`
- Store `stripe_customer_id` for recurring/off-session charges

### Twilio Integration

- Outbound calls initiated via `supabase/functions/initiate-call/index.ts`
- Speech recognition: Twilio built-in Gather + Gemini intent classification
- TTS: Twilio Say command (English/Bulgarian support via next-intl)
- Recording: Enabled by default, URL stored in `calls.twilio_recording_url`

### AI (Gemini) Integration

- Model: `gemini-2.0-flash` (Google Generative AI)
- Purpose: Intent classification during calls (`classifyIntentWithGemini()`)
- Fallback: Keyword-based classification if API fails
- Alternative: Claude/OpenAI can be swapped (see `call-handler/index.ts`)

### i18n (next-intl)

- Locales: `en` (default), `bg` (Bulgarian)
- Routing: `lib/i18n/routing.ts` defines locale handling
- Messages: `messages/en.json`, `messages/bg.json`
- Call messages: `lib/translations/call-messages.ts` (language-specific TwiML)

## Key Files Reference

### Must Read Before Major Changes

- `docs/AI_Caller_Bot_PRD.md` - Complete requirements & payment flow
- `docs/TECH_STACK.md` - Technology decisions & patterns
- `database-schema.sql` - Consolidated database schema (source of truth)
- `ENV_REFERENCE.md` - All environment variables by file

### Critical Implementation Files

- `app/api/orders/route.ts` - Order creation & SetupIntent flow
- `supabase/functions/stripe-webhook/index.ts` - Webhook handling & call trigger
- `supabase/functions/call-handler/index.ts` - AI call state machine
- `lib/stripe.ts` - Stripe helpers (createSetupIntent, createCustomer)

### Configuration

- `package.json` - Dependencies (Twilio, Stripe, @google/generative-ai, next-intl)
- `next.config.ts` - Image domains, deployment settings
- `supabase/config.toml` - Supabase project configuration

## Common Pitfalls

1. **Don't create PaymentIntent with manual capture** - Use SetupIntent flow instead
2. **Don't forget idempotency checks** in webhooks (check `stripe_event_id`)
3. **Don't use Node.js patterns in Edge Functions** - They run on Deno (use `npm:` imports)
4. **Don't skip Twilio signature validation** in production (currently disabled for dev)
5. **Don't forget to update both migration files AND database-schema.sql**
6. **Don't use `alert()`** - Use toast/modal components instead
7. **Don't assume checkout creates charge** - It only saves the card via SetupIntent

## Environment Variables Cheat Sheet

### Next.js (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
DEV_BYPASS_AUTH=true  # Dev only!
```

### Supabase Edge Functions (set via `supabase secrets set`)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxxxx
TWILIO_PHONE_NUMBER=+1234567890
GOOGLE_API_KEY=AIza...  # Gemini AI
```

## When Stuck

1. Check `docs/AI_Caller_Bot_PRD.md` for requirements
2. Check `ENV_REFERENCE.md` for missing environment variables
3. Check `database-schema.sql` for current table structure
4. Check `docs/TESTING.md` for auth bypass and testing tips
5. Verify Stripe webhooks are hitting Edge Functions (check logs: `supabase functions logs`)


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