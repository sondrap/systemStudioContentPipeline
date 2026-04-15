---
name: Multi-Format Studio
description: One research pass, every format it needs to land in — LinkedIn article, X/Twitter thread, and newsletter edition all generated from the same research brief, each native to its platform.
effort: large
status: planned
---

The research brief is the most expensive thing the pipeline produces. Right now it feeds exactly one output: the blog article. This makes that investment go 4x further. From a single research pass, Sondra gets a full blog article, a LinkedIn long-form piece, a Twitter/X thread, and a newsletter edition — each written for how people actually read on that platform.

## What it looks like

**Format Selection at Draft Time**
- When kicking off research or after a brief is complete, Sondra selects which formats she wants to produce
- Defaults: Blog Article (always), plus any combination of LinkedIn Article, X Thread, Newsletter
- Each format is generated as a separate output, runs in parallel

**Format-Specific Output Screens**
- Each format has its own review screen:
  - **LinkedIn Article:** Long-form post (1,500-2,000 words), native LinkedIn formatting, section headers as bold text, strong hook in the first line
  - **X/Twitter Thread:** 8-15 tweet thread. Each tweet is self-contained but builds on the previous. First tweet is the thesis. Last tweet links back to the blog post. Thread reads as a complete argument.
  - **Newsletter Edition:** Structured as an email — subject line, preview text, brief intro, 3-5 key takeaways from the article, a closing thought, unsubscribe footer. Written for inbox, not for a feed.
- All formats maintain Sondra's voice. LinkedIn is slightly more polished. X is punchy and opinionated. Newsletter is conversational.

**Format Dashboard Panel**
- On each article card in the pipeline, a row of format icons shows which formats have been produced and their status (draft / approved / published)
- Publishing each format is a separate action — Sondra can publish the blog without touching LinkedIn

## Key details

- Formats are produced in parallel during the drafting phase — no additional wait time beyond the blog draft itself
- Each format is stored as a separate record linked to the parent article
- Formats can be regenerated independently if the blog article changes
- The X thread format respects the 280-character limit per tweet with a buffer for readability
- Newsletter format is a prerequisite for the Built-In Newsletter feature (it provides the content template)

~~~
Add a `formats` table: `articleId` (FK), `type` ('linkedin' | 'x-thread' | 'newsletter'), `content` (JSON — structure varies by type), `status` ('draft' | 'approved' | 'published'), `publishedAt` (timestamp), `publishedUrl` (string).

During the drafting `runTask()`:
- After the main article draft completes, fan out `generateText` calls for each selected format
- Each call gets: the research brief, the final article body, the voice profile, and format-specific instructions
- X thread: generate as an array of tweet objects `{ tweetNumber, text, charCount }`
- LinkedIn article: generate as markdown (LinkedIn renders a subset)
- Newsletter: generate as `{ subject, previewText, body (markdown), closingThought }`

Format review screens are new routes: `/articles/:id/formats/:type`. Reuse the editor shell with format-specific components for rendering and editing.

Publishing each format calls the relevant integration (LinkedIn API, Twitter/X API, or email delivery). Platform connections managed in Settings.
~~~
