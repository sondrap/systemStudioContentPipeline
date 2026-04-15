---
name: Web Interface
description: Frontend web interface for the SystemStudio Pipeline
---

# Web Interface

The app is a desktop-primary editorial tool with four main views: Pipeline Dashboard, Article Editor, Chat, and Topic Backlog. The interface uses a three-column layout on desktop: a narrow icon rail, a contextual sidebar, and the main content area.

~~~
Auth is required for all views. Single user (Sondra), email-code login. After auth, land on the Pipeline Dashboard. The login screen should feel like unlocking a workspace: centered card on `#13171A` background with the pen nib icon above it, email input, teal CTA. No splash or welcome modal after login.

Default preview mode: desktop (set in `web.json`). Mobile must work for quick reviews/approvals.
~~~

## Layout Structure

### Desktop (above 1024px)

A [three-column layout]{Rail + Sidebar + Main Content}:

~~~
- **Rail** (56px wide, fixed): Pen nib icon at top, then four view icons stacked vertically (Pipeline, Editor/Articles, Chat, Backlog). Active state: Deep Current icon with Blush Veil background pill. Bottom: settings gear. Background: white. Border-right: `1px solid #D4E4F1`. Always visible.
- **Sidebar** (260px, fixed, collapsible): Contextual to current view. On Pipeline: pipeline stats + recent articles list. On Editor: article metadata + outline. On Chat: conversation history/threads. On Backlog: topic categories + sort/filter. Background: white. Border-right: `1px solid #D4E4F1`.
- **Main Content** (flex remaining): The working area. Background: Linen. Max-width `960px` for reading comfort in editor, full-width for pipeline dashboard.

Sidebar collapse: 250ms width animation, content fades out at 150ms before shrink, fades in at 150ms after expand.
~~~

### Tablet (768px to 1024px)

Rail visible, sidebar collapsed by default (toggled via hamburger or swipe). Main content fills remaining space.

### Mobile (below 768px)

Rail becomes a bottom tab bar (56px tall, 4 icons). Sidebar becomes a slide-in drawer (swipe-right or hamburger). Main content goes full-width.

~~~
Mobile viewport: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`. Use `dvh`/`svh` for viewport heights. Bottom tab bar has `user-select: none`.
~~~

## Pipeline Dashboard

The primary view. A four-column editorial pipeline showing articles moving through stages.

~~~
Four columns displayed as a horizontal grid on desktop. Each column has a header with a colored dot indicating stage, stage label (Bespoke Serif 18px weight 500), and article count.

On mobile (below 768px), the four columns become a single scrollable list grouped by stage with collapsible headers.

Columns:
1. **Researching** (Deep Current dot) — cards show topic + source count + date added
2. **Drafting** (Sage Stone dot) — cards show title + word count + last edited
3. **Review** (Blush Veil dot) — cards show title + "Ready for review" tag. These need attention.
4. **Published** (Sage Stone dot with check) — cards show title + publish date + link icon

Card anatomy: White background, Morning Mist border, `12px` border-radius, `16px` padding. Article title in Bespoke Serif 16px weight 500 (Deep Current). Metadata row: Satoshi 12px weight 500 uppercase in Sage Stone, date and word count dot-separated. Optional status tag pill.

Cards are draggable between columns on desktop. On mobile, use a long-press menu or swipe action with "Move to..." bottom sheet. Right-click/overflow menu also available on desktop.

Clicking a card navigates to the Article Editor for that article.

Page title: "Content Pipeline" in Bespoke Serif 28px weight 500, with today's date in Satoshi 12px uppercase to the right.

Pipeline dashboard should load all articles in one fetch and render from a local store. No per-column loading.
~~~

## Article Editor / Review Screen

The centerpiece. A premium reading and editing environment.

### Layout

Centered reading column (max-width 680px) with a metadata panel on the right (280px). On screens below 1200px, metadata panel collapses to a slide-in sheet triggered by a button.

~~~
**Content column:**
- Back button: subtle "< Pipeline" link at top
- Article title: Bespoke Serif 36px weight 500, Deep Current
- Hero image: displayed above the body, full-width of the reading column. Aspect ratio 1200:630. `border-radius: 16px`. If no image yet, show a placeholder with a "Generate Image" button.
- Metadata row beneath title: Satoshi 12px weight 500 uppercase, Sage Stone (date, word count, reading time, dot-separated)
- Article body: Satoshi 17px weight 400, `line-height: 1.65`, Deep Current. Max reading width 680px.
- Inline editing: clicking into text makes it editable in place (no edit mode toggle). Use a rich text library (Tiptap). Auto-save: debounced 2-second delay after last keystroke. Subtle save indicator in metadata panel ("Saved" / "Saving..." in Satoshi 12px).

**Metadata panel:**
- Stage: Blush Veil pill tag showing current status
- Sections: "Topic", "Keywords", "SEO Score", "Sources", each with Satoshi 12px weight 500 uppercase label in Sage Stone, values in Satoshi 14px weight 400 Deep Current
- Research brief summary (if available): expandable section showing key findings and sources
- Actions pinned to bottom:
  - In Review: "Approve & Publish" (Blush Veil filled button) + "Send Back" (ghost)
  - When editing: "Save Changes" replaces approve button (no layout shift)
  - "Send Back" opens a textarea for revision notes before sending back to drafting
  - "Regenerate Image" button (ghost) to get a new hero image

Content loads with a fade-in from opacity 0 with `translateY(4px)` over 300ms. Metadata panel items stagger in with 50ms delays.
~~~

## Chat

A conversational interface for brainstorming and ad-hoc requests with the editorial AI agent.

### Layout

Full main content area, no sidebar metadata panel. Chat messages centered in max-width 720px column. Input bar fixed at bottom.

~~~
**Message styling:**
- Sondra's messages: right-aligned, white background with Morning Mist border. Satoshi 15px. Border-radius `16px 16px 4px 16px` (sharp bottom-right). Max-width 70%.
- AI messages: left-aligned, no background, text sits on Linen. Bespoke Serif 16px weight 400, `line-height: 1.65`. This gives AI responses an editorial quality. Max-width 85%.
- AI responses with structured content (outlines, article plans): subtle card treatment with white background, Morning Mist border, `12px` radius, `16px` padding.

**Input bar:** Fixed bottom of main content. Single input with white background, Morning Mist border, `12px` radius, 52px height. Placeholder: "Brainstorm a topic, ask for research, or outline an article..." in Sage Stone at 50% opacity. Send button: Blush Veil circle (36px) with Deep Current arrow-up icon, inside the input at right.

Use `react-textarea-autosize` for auto-growing input. Disable while agent is streaming, show stop button. Use `streamdown` for rendering markdown from streaming text. Use `use-stick-to-bottom` for auto-scroll behavior.

Streaming: pre-allocate min-height for AI message containers. As text streams, container grows smoothly downward. Typing indicator: three dots in Sage Stone with staggered opacity pulse.

Messages slide in from bottom with `translateY(12px)`, 250ms ease-out.
~~~

## Topic Backlog

A compact list view optimized for density and scannability.

### Layout

Full main content area. Single scrolling list with optional grouping.

~~~
**Top bar:** Search input (pill-shaped, Morning Mist border, search icon) + "Add Topic" button (Blush Veil, small pill).

**List structure:**
- Each topic row: 48px height, full-width, hover state drops to Linen
- Left: 8px colored dot (Deep Current = high priority, Sage Stone at 50% = normal)
- Topic title: Satoshi 14px weight 500, Deep Current
- Right: metadata in Satoshi 12px weight 500 uppercase Sage Stone (date added, source count)
- Far right: overflow menu (three dots)
- Agent-suggested topics show a subtle "Suggested" label in Sage Stone italic next to the title, plus the agent's reasoning appears in the detail panel

Clicking a topic opens a slide-in panel from the right (320px wide) showing full topic details, description, source URLs, agent reasoning (if suggested), and action buttons:
- "Start Research" — creates an article from this topic and kicks off the research pipeline
- "Edit" — modify topic details
- "Delete" — remove from backlog

"Add Topic" opens a compact modal with fields: topic title (required), brief description (optional), source URLs (optional, multi-line), priority toggle (normal/high). Not a full page, a centered modal.

Topics are sorted: high priority first, then by most recently added. Agent-suggested topics that haven't been reviewed yet could have a subtle Blush Veil left border to draw attention.
~~~

## Authentication

Single screen. Centered card on Linen background.

~~~
The login screen:
- Pen nib icon (or "S" monogram matching main site) centered above the card
- Card: white background, Morning Mist border, `16px` border-radius, `32px` padding
- "SystemStudio Pipeline" in Bespoke Serif 22px weight 500 beneath the icon
- Email input field
- "Send Code" Blush Veil button (full-width of card)

After sending code:
- Transition smoothly (no page reload) to code entry
- "Check your email" with the address displayed in Sage Stone
- 6-digit code input as individual digit boxes, large, auto-advance, auto-submit on paste
- Resend option with 30-second cooldown timer
- "Use a different email" link to go back

After verification: cross-fade directly into the Pipeline Dashboard, no splash screen.

Error states inline and immediate: "Wrong code. Try again." for invalid code. "Code expired. Request a new one." for expired. No layout shift from error messages.
~~~

## Data Loading Strategy

Load all articles and topics in a single initial fetch on app start. Store in a Zustand store. Navigation between views is instant from memory. After mutations (create, update, stage change), optimistically update the store and fire the API call in the background.

~~~
One method: `getDashboardData()` returns `{ articles, topics }`. Called once on app start after auth. Store in Zustand. Individual mutations call their methods and update the store optimistically.

For the chat, use the agent chat client which handles its own state.

Skeleton loading on initial load: pipeline cards as skeleton rectangles matching card layout. Subtle opacity pulsing (0.5 to 0.8, 1.5s loop), no shimmer.
~~~

## Routing

~~~
Routes:
- `/` — Pipeline Dashboard (default after login)
- `/articles/:id` — Article Editor
- `/chat` — Chat with agent
- `/backlog` — Topic Backlog
- `/login` — Auth screen (redirect to `/` if already authenticated)

Use `wouter` for routing. Guard all routes except `/login` behind auth check. Redirect unauthenticated users to `/login`.
~~~
