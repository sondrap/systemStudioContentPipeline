---
name: The Pipeline
description: Four-stage AI content pipeline — from topic to published article — with research, drafting, review, and one-click publishing to systemstudio.ai.
effort: large
status: done
---

SystemStudio Pipeline is live. Sondra has a private editorial command center: a four-stage pipeline that takes a topic idea all the way to a published article, with AI handling the research and first draft while she stays in control of what goes out.

## What was built

**The Pipeline Dashboard**
- Four-column Kanban: Researching, Drafting, Review, Published
- Article cards showing status, word count, and metadata at a glance
- Draggable cards between stages on desktop; long-press menu on mobile
- Real-time updates as background AI tasks complete

**Research Phase**
- Autonomous task agents search the web and scrape Sondra's trusted source list
- Produces a structured brief: key findings, notable quotes, primary sources
- Prioritizes depth over breadth — 5 well-understood sources over 20 shallow ones
- Automatically transitions to drafting when complete

**Writing Phase**
- Drafts full articles using the research brief and Sondra's voice profile: direct, specific, opinionated, no filler
- Hero image generated in Editorial Still Life style alongside the text
- Produces title, subtitle, body (markdown), meta description, and SEO keywords
- Automatically transitions to review when complete

**Review & Edit**
- Premium reading environment with inline editing (Tiptap) and 2-second auto-save
- Send back with revision notes for a targeted AI rewrite (no repeat research pass)
- Full research brief expandable in the metadata sidebar while reviewing
- Approve & Publish flow with brass-to-green success state and confetti

**Publishing**
- One-click publish to systemstudio.ai via API
- Dry-run mode fully operational — articles marked published locally when API is unconfigured
- Published URL and timestamp stored on the article record

**Topic Backlog**
- Running list of article ideas with priority, description, and source URLs
- One click to send any topic into the research pipeline
- Agent-suggested and manually entered topics both supported

**Chat Agent (Claude 4.6 Sonnet)**
- Conversational editorial colleague — not a chatbot, an opinionated coworker
- Can start research, create topics, check pipeline status, and search the web
- Knows Sondra's voice, interests, and source ecosystem
- Conversation threads with auto-generated titles and persistent history

**Auth**
- Email-code login protecting the entire tool
- Single-user (Sondra), no role complexity

**Visual Identity**
- Fonts: Bespoke Serif (headlines, article titles) and Satoshi (UI, body text)
- Palette: Linen background, Deep Current primary, Sage Stone secondary, Blush Veil accents, Morning Mist for callouts
- Three-column layout on desktop (rail + sidebar + main content), bottom tab bar on mobile

## History

- **April 2026** — Initial build complete. Four-stage pipeline, topic backlog, chat agent, hero image generation (Editorial Still Life), publishing to systemstudio.ai with dry-run mode, full web interface in SystemStudio brand.
