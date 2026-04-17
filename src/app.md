---
name: SystemStudio Pipeline
description: AI-powered content pipeline for researching, writing, and publishing articles to systemstudio.ai
---

# SystemStudio Pipeline

A content authoring tool for Sondra Patton (SystemStudio.ai) that automates the research-to-publish pipeline for her blog. The app uses AI to research topics across the web, write articles in Sondra's voice, generate cohesive article images, and publish finished pieces to her main site via API.

~~~
This is a single-user tool. Sondra is the only user. Auth exists to protect the tool (email-code login), not to manage multiple users. One role: `admin`. The auth table doubles as her profile.
~~~

## The Audience

The pipeline is not generic. Every stage is oriented toward a specific [ideal customer]{Non-technical founders and small business owners under $50M revenue. Full profile in `src/audience.md`, source research in `src/references/audience-research.md`.}: non-technical founders who want relief from AI-related pain, not more AI technology to manage.

The audience profile (`src/audience.md`) is read by the research scanner, the drafting agent, and the revision agent. It shapes:

- **What topics get proposed.** The scanner weights audience pain (tool sprawl, AI anxiety, investor pressure, hype skepticism) heavily and rejects topics that only work from a practitioner angle.
- **Where research is sourced from.** Research prioritizes audience sources (r/Entrepreneur, r/smallbusiness, r/AiForSmallBusiness, LinkedIn founder voices) over signal sources (practitioner channels, AI frameworks, technical newsletters). The best topics sit at the intersection.
- **How articles get written.** The drafting prompt includes explicit instruction to speak TO the non-technical founder, translate or avoid jargon, anchor examples in small business reality, and validate the reader's overwhelm before instructing.
- **How revisions stay on-track.** The send-back prompt carries the same audience lens so that even during revisions the voice stays oriented at the reader, not at the technology.

~~~
**Exported constants in `dist/methods/src/common/voiceProfile.ts`:**
- `VOICE_PROFILE` — how Sondra writes (her voice characteristics)
- `AUDIENCE_PROFILE` — who she's writing FOR (the ICP)
- `RESEARCH_SOURCES` — split into AUDIENCE sources (primary) and SIGNAL sources (secondary) with explicit guidance on finding intersections
- `IMAGE_STYLE_ANCHOR` — editorial still-life style specification

These are imported by `scanTopics.ts`, `startArticle.ts`, and `sendBack.ts`. When the audience changes or expands, update `src/audience.md` and `AUDIENCE_PROFILE` together; they should stay in sync.

**Why this matters:** Without an explicit audience lens, the research agent drifts toward what it finds novel in AI (which tends practitioner-technical). The audience profile acts as a filter: every topic, every paragraph must earn its place by landing with the ICP.
~~~

In the article editor sidebar, a "Writing For" card shows a one-liner version of the ICP at the moment of review, reminding Sondra who the content is targeting while she edits.

## The Pipeline

Every article moves through four stages: [Researching]{AI agents actively gathering information from sources, summarizing findings, identifying key angles}, [Drafting]{AI writes the article using research findings and Sondra's voice profile}, [Review]{Article is ready for Sondra to read, edit, and approve}, and [Published]{Article has been sent to systemstudio.ai and is live}.

Articles enter the pipeline when Sondra approves a topic from the backlog (or asks the chat agent to start one directly). The agent never auto-starts research on its own. Sondra always decides what's worth the research investment.

~~~
Article status values: `researching`, `drafting`, `review`, `published`. Transitions:
- `researching` -> `drafting` (automatic, when research completes)
- `drafting` -> `review` (automatic, when draft completes)
- `review` -> `published` (manual, Sondra approves)
- `review` -> `drafting` (manual, Sondra sends back with notes)
- Any stage can be manually moved to any other stage via the UI.

Articles can also be created directly in `review` stage if Sondra writes or pastes one herself.
~~~

### Research Phase

When a topic enters the pipeline, the research agent goes to work. It searches the web, scrapes relevant articles and sources, and compiles a research brief: key facts, notable quotes, recent developments, who's saying what, and links to primary sources.

~~~
Use `runTask()` with `searchGoogle`, `scrapeUrl`, and `generateText` tools. The task agent should:
1. Search for the topic across multiple queries (the topic itself, recent news, expert opinions)
2. Scrape the top results and relevant source sites from the configured source list
3. Synthesize findings into a structured research brief

The research brief is stored as JSON on the article record: `{ summary: string, keyFindings: string[], sources: { url: string, title: string, relevance: string }[], quotes: { text: string, attribution: string }[] }`.

Research runs as a fire-and-forget background task. The method returns immediately with status `researching`. The task updates the article record when complete and transitions to `drafting`.
~~~

The research should go deep, not wide. Better to have thorough understanding of 5 good sources than shallow summaries of 20. The agent should prioritize sources from the [configured source list]{See `src/sources.md` for the full list of trusted sources, YouTube channels, GitHub repos, newsletters, and thought leaders Sondra follows.} but also search broadly.

### Writing Phase

Once research completes, the writing agent drafts the article using the research brief and [Sondra's voice profile]{See `src/voice-profile.md` for the detailed voice profile extracted from her writing samples.}. The article should feel like Sondra wrote it herself: direct, specific, opinionated, with personal anecdotes where relevant and zero tolerance for hype or filler.

~~~
Use `generateText` with a carefully constructed prompt that includes:
1. The voice profile (key characteristics, dos and don'ts)
2. The research brief
3. The article type guidance (thought leadership, educational, commentary)
4. Instructions for length, structure, and tone
5. The Journal content spec formatting rules (from `src/references/journal-content-spec.md`)

The draft includes: title, slug, body (markdown), excerpt, suggested tags, and ogDescription. These map directly to the Journal API data structure. Store as fields on the article record.

Writing also runs as a background task. Transitions to `review` when complete.
~~~

### Image Generation

Each article gets multiple images: **one hero image at the top** plus **two in-body images** placed at natural break points. Total of three images per article, which hits the industry minimum and creates visual rhythm through the piece. All images share the same [Editorial Still Life]{Painterly object compositions on a linen surface, with objects chosen to metaphorically relate to the article topic. All images share the same lighting, surface, and palette so they look cohesive.} style.

~~~
**Why three images, not one.** Research on blog post best practices (see `src/references/image-best-practices.md`) shows posts with an image at every scroll depth are shared 2x as often as text-heavy posts and retain readers dramatically better. A single hero image is not enough for a 1,500+ word article.

**The three-image pipeline:**

1. **Pick body break points.** The AI analyzes the article (titled, with H2 headings finalized) and picks exactly 2 H2 headings after which to place an in-body image. Avoids the first H2 (too close to hero) and the last H2 (conclusion doesn't need a visual break). Each pick includes an article-specific concept: objects chosen from the brand bank plus a statement of what each object means in THIS section's argument.

2. **Pick hero concept.** A separate concept for the whole-article metaphor, with `avoidObjects` set to the objects already reserved for body images so all three images use distinct object combinations.

3. **Render all three in parallel.** `Promise.all` with `renderStillLife()` for the hero and each body image. Each call independently handles errors so one failure doesn't kill the others.

4. **Insert body images into the markdown body.** Walk the body line by line. When a matching H2 heading is found, advance past the heading and the first paragraph of that section, then insert `![altText](imageUrl)` with blank lines on each side. This places the image partway into the section so the heading and opening thought stay together.

**Break point selection rules:**
- Articles with fewer than 3 H2 headings skip body images entirely (the article is too short to need them).
- The AI returns headings that must match one of the provided H2s. If the AI paraphrases, we fuzzy match (lowercase substring match in either direction).
- The two body images must use different object combinations from each other.

**Style Anchor (constant, never changes across all three images):**
"Soft-focus editorial still life composition in a painterly, slightly impressionistic rendering style, clearly not a photograph but evocative of one. Objects arranged on a pale linen surface (#F7F4F2). Soft directional window light from the upper left, casting long gentle shadows. Shallow depth of field with the background dissolving into a warm creamy blur. Color palette strictly restricted to: deep muted teal (#365367), sage green (#577267), blush pink (#ECD8DC), pale blue (#D4E4F1), warm linen white (#F7F4F2), and natural brass/gold. Premium editorial magazine aesthetic. Matte surfaces, no gloss. Generous negative space. Horizontal composition."

**Objects** are chosen from a fixed 10-item bank with symbolic meanings (ceramic sphere, river stones, glass cube, glass vessel, folded paper, linen rope, dried botanical stems, brass geometric shapes, wooden blocks, brass key). The AI MUST pick only from this bank.

**Rules:**
- No text in images
- No screens, devices, or technology objects
- No human figures or hands
- 3-4 objects maximum per image
- Each object must have a clear, recognizable silhouette
- Generate at 2048x1076 for 1200x630 hero crop and square thumbnail crop

The hero image's alt text is stored on `coverImageAlt` and displayed in the article editor sidebar as an "Image Concept" section. Body images get their alt text inlined into the markdown. The `regenerateImage` method regenerates only the hero, using the same shared helpers (`pickImageConcept` and `renderStillLife` in `dist/methods/src/common/generateStillLife.ts`).

Generate as part of the drafting phase, after the SEO pass (because the focus keyword helps inform object selection).
~~~

### Review Phase

Articles in review are Sondra's inbox. She reads the full article, makes edits inline, reviews the hero image, and either approves for publication or sends it back to drafting with notes.

When sending back, Sondra can add [revision notes]{Free-text feedback that gets appended to the article's context for the next drafting pass. Examples: "Too formal in the opening", "Missing the point about fine-tuning costs", "Add my experience with Travis Sago's data".} that guide the rewrite.

### Publishing

When Sondra approves an article, the app publishes it to her main site (systemstudio.ai) via API. The publish action sends the article data in the [Journal API format]{See `src/references/journal-content-spec.md` for the exact data structure: title, slug, excerpt, body, tags, publishedAt, coverImageUrl, coverImageAlt, ogDescription.}.

~~~
Publishing to the main site requires an API endpoint on systemstudio.ai. Store the API endpoint URL and auth token as secrets (`PUBLISH_API_URL`, `PUBLISH_API_TOKEN`).

The publish method:
1. Formats the article into the Journal API structure
2. Generates a slug from the title
3. Sends to `POST {PUBLISH_API_URL}` with `Authorization: Bearer {PUBLISH_API_TOKEN}`
4. Updates the article record with `status: 'published'`, `publishedAt` timestamp, and `publishedUrl`

If the API isn't configured yet, the publish action works in "dry run" mode: marks the article as published locally and stores the formatted data. The pipeline is fully functional before the main site integration is wired up.
~~~

### SEO Integration

SEO is woven through every pipeline stage rather than treated as a separate step. The goal is for articles to arrive at the review phase already optimized, with clear visibility into what matters for search so Sondra can edit with confidence.

**At the topic stage**, the scanner researches keyword opportunity for each topic it proposes. For every topic, it identifies the best [focus keyword]{A 2-4 word phrase a reader would actually type into Google. Must reflect search intent, not just topic relevance.} and assesses [SEO opportunity]{One of `high`, `moderate`, or `low`. Based on estimated search volume, competition from major publications, and whether there's a clear angle for a plain-language business take.}. Sondra sees this signal on every topic in the backlog so she can prioritize what to write based on real search demand.

~~~
Topics table gets two new columns: `seoOpportunity` ('high' | 'moderate' | 'low') and `suggestedKeyword` (string).

The `scanTopics` task agent is extended to research keyword opportunity as part of its scan. The agent searches Google for the candidate keyword, assesses result quality, and returns `suggestedKeyword` and `seoOpportunity` alongside each topic.
~~~

**At the research stage**, the research agent analyzes the top 3-5 Google results for each topic to understand what competitors are covering. It extracts common keywords across competing articles and identifies content gaps (angles, questions, or audience perspectives that competitors miss). This competitor intelligence is stored on the research brief and used by the writing agent to position the article distinctively.

~~~
The `researchBrief` field on articles gets a new `competitorInsights` sub-object:
- `topArticles`: array of `{ url, title, focusKeyword?, wordCount? }` — the top 3-5 competing pieces
- `commonKeywords`: array of strings — keywords used across multiple competitors
- `gaps`: array of strings — angles competitors miss that create opportunity

The research task agent is given instructions to do this analysis as part of its web search pass.
~~~

**At the writing stage**, the draft is produced with the topic's focus keyword already as a target. The writing prompt includes competitor gap analysis so the article naturally differentiates. The existing SEO optimization pass (which generates focus keyword, meta description, and OG description) refines but does not replace the topic-level keyword.

**At the review stage**, the article editor shows a live SEO score panel. The panel includes:
- A [live 0-100 score]{Computed client-side as the user edits. Updates in real time on every keystroke without a server round-trip.} based on 10 weighted checks
- Each check shows [pass/fail status]{Green check for passing, warning icon for failing. Every check explains what's wrong and what to fix.} with specific detail
- [Editable SEO fields]{Focus keyword, meta description, URL slug. Debounced save after 1.5s of inactivity.} for focus keyword, meta description, and slug
- A [keyword highlight toggle]{When on, the article body renders as a read-only view with the focus keyword highlighted in gold. A "Back to editing" button returns to the editable textarea.} that highlights every occurrence of the focus keyword in the article body, so Sondra can see at a glance what's there for SEO vs what's safe to rephrase
- The competitor insights from research (keywords, gaps, top articles) shown in a collapsible section for context while editing

~~~
The SEO checks (all weighted equally-ish, 5-15 points each):
1. Focus keyword is set (10)
2. Focus keyword in title (15)
3. Focus keyword in first 150 words (15)
4. Keyword density between 0.5% and 3.5% (10)
5. Focus keyword in at least one H2 heading (10)
6. Focus keyword in excerpt (5)
7. Meta description is 120-165 characters (10)
8. Article is 800+ words (10)
9. URL slug is set (5)
10. Article has 2+ H2 section headings (10)

Score = round((earned weights / total weights) * 100).

All scoring runs client-side in `utils/seoScore.ts`. No backend call needed.
~~~

**At the publish stage**, meta description length is validated before the Journal API call. The slug is generated from the title if not explicitly set. Any failing critical SEO checks are surfaced as non-blocking warnings so Sondra can make an informed decision to publish anyway or fix issues first.

## Topic Backlog

Sondra maintains a backlog of topic ideas. Topics can enter the backlog from multiple sources:

- **Agent-suggested topics:** The chat agent can scan Sondra's source ecosystem (newsletters, GitHub repos, YouTube channels, Reddit communities) and suggest topics based on what's trending, what's new, and what aligns with her content angle. Each suggestion includes a brief explanation of why it's worth writing about and links to relevant sources.
- **Manual entry:** Sondra has an idea and adds it directly.
- **Automated scanning:** A cron job runs twice a week (Mondays and Thursdays at 7am CT) that searches the web for recent developments across Sondra's focus areas, checks against the existing backlog to avoid duplicates, and adds 3-5 fresh topic suggestions. Sondra can also trigger a scan manually from the Backlog page or by asking the chat agent.

~~~
The `scanTopics` method uses `runTask()` with `searchGoogle` and `scrapeUrl` tools to research trending developments. It checks existing topics and recent articles to avoid duplicates. The task agent produces structured suggestions with title, description, reasoning, priority, and source URLs. Results are added to the topics table as agent-suggested entries.

Cron schedule: `0 12 * * 1,4` (Monday and Thursday at 12:00 UTC / 7am CT).
Allows both `admin` and `system` roles so it works from both cron and manual triggers.
~~~

Each topic has a title, optional description, optional source URLs, and a [priority]{`high` or `normal`. High-priority topics surface at the top of the backlog.}. Topics sit in the backlog until Sondra explicitly approves one for research by clicking "Start Research." This is the checkpoint before the expensive research phase begins.

~~~
Topics table: `title` (string), `description` (string, optional), `sourceUrls` (string[], stored as JSON), `priority` ('high' | 'normal', default 'normal'), `status` ('backlog' | 'in-pipeline', default 'backlog'), `articleId` (string, optional, links to the article created from this topic), `suggestedBy` ('agent' | 'manual', default 'manual'), `reasoning` (string, optional, the agent's explanation for why this topic is worth covering).
~~~

## Data Model

The app stores articles, topics, and settings.

~~~
### Articles table
- `title` (string) — article headline
- `subtitle` (string, optional) — article subtitle/deck
- `body` (string) — article content in markdown
- `status` ('researching' | 'drafting' | 'review' | 'published')
- `topicId` (string, optional) — link back to the originating topic
- `researchBrief` (object, optional) — structured research findings (JSON)
- `imageUrl` (string, optional) — hero image CDN URL
- `seoKeywords` (string[], optional, JSON) — suggested keywords
- `metaDescription` (string, optional) — SEO meta description
- `revisionNotes` (string, optional) — feedback for rewrite
- `publishedAt` (number, optional) — unix ms timestamp
- `publishedUrl` (string, optional) — URL on systemstudio.ai
- `wordCount` (number, optional) — computed on save
- `articleType` ('thought-leadership' | 'educational' | 'commentary' | 'mixed') — guides tone

### Topics table
- `title` (string)
- `description` (string, optional)
- `sourceUrls` (string[], JSON)
- `priority` ('high' | 'normal')
- `status` ('backlog' | 'in-pipeline')
- `articleId` (string, optional)

### Users table (auth table)
- `email` (string) — auth-managed
- `roles` (string[]) — auth-managed
- `displayName` (string)
- `imageStyleGuide` (string, optional) — description of the desired image style for consistency

### Settings
App-wide settings (publish API URL, image style preferences, etc.) are stored as secrets or as fields on the user record since this is single-user. The `imageStyleGuide` on the user record controls the visual style used when generating article images.
~~~

## Chat Agent

The app includes a conversational AI agent for brainstorming and ad-hoc requests. Sondra can talk to the agent to:

- Brainstorm article topics ("What should I write about this week?")
- Ask for quick research on a topic before committing it to the pipeline
- Request an article be started ("Write me something about the cost of fine-tuning vs RAG")
- Get summaries of recent developments in her areas of interest
- Discuss and refine article outlines

The agent has access to the research and writing tools, the topic backlog, and the article pipeline. It knows Sondra's voice and interests.

~~~
Agent interface with tools: createTopic, listTopics, startArticle, listArticles, getArticle, searchWeb (for quick research). The agent's personality should match the app's editorial tone: professional, direct, knowledgeable about AI and data topics, slightly dry humor. Not a chatbot, an editorial colleague.
~~~

## Publishing to LinkedIn

Future feature. After an article is published to the blog, optionally cross-post a condensed version to LinkedIn. This requires LinkedIn API integration and is not part of the MVP.
