---
name: SystemStudio Pipeline
description: AI-powered content pipeline for researching, writing, and publishing articles to systemstudio.ai
---

# SystemStudio Pipeline

A content authoring tool for Sondra Patton (SystemStudio.ai) that automates the research-to-publish pipeline for her blog. The app uses AI to research topics across the web, write articles in Sondra's voice, generate cohesive article images, and publish finished pieces to her main site via API.

~~~
This is a single-user tool. Sondra is the only user. Auth exists to protect the tool (email-code login), not to manage multiple users. One role: `admin`. The auth table doubles as her profile.
~~~

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

Each article gets a hero image in the [Editorial Still Life]{Painterly object compositions on a linen surface, with objects chosen to metaphorically relate to the article topic. All images share the same lighting, surface, and palette so they look cohesive on the blog listing page.} style.

~~~
Use `generateImage` with a prompt assembled from three parts:

**Style Anchor (constant, never changes):**
"Soft-focus editorial still life composition in a painterly, slightly impressionistic rendering style, clearly not a photograph but evocative of one. Objects arranged on a pale linen surface (#F7F4F2). Soft directional window light from the upper left, casting long gentle shadows. Shallow depth of field with the background dissolving into a warm creamy blur. Color palette strictly restricted to: deep muted teal (#365367), sage green (#577267), blush pink (#ECD8DC), pale blue (#D4E4F1), warm linen white (#F7F4F2), and natural brass/gold. Premium editorial magazine aesthetic. Matte surfaces, no gloss. Generous negative space. Horizontal composition."

**Objects (varies per article, 3-4 max):** Chosen by the AI to metaphorically relate to the article topic. Object bank:
- Smooth ceramic sphere (Deep Current) = completeness, self-contained systems
- Stacked flat river stones (Deep Current + Sage) = layering, foundations
- Frosted glass cube (Morning Mist) = transparency, containment, data
- Glass vessel with pale liquid (Morning Mist) = containment, volume, proprietary data
- Folded handmade paper (Blush Veil) = drafts, documents, iterating
- Coiled linen rope/thread (Linen) = connection, sequence, pipelines
- Dried botanical stems (Sage Stone) = growth, organic processes
- Small brass geometric shapes = precision, engineering, structure
- Smooth wooden blocks (Sage Stone) = building blocks, modularity
- Single brass key = access, unlocking, proprietary

**Rules:**
- No text in images
- No screens, devices, or technology objects
- No human figures or hands
- 3-4 objects maximum per image
- Generate at high resolution for 1200x630 hero crop and square thumbnail crop

Generate as part of the drafting phase, in parallel with text generation. Store URL as `imageUrl`.
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

## Topic Backlog

Sondra maintains a backlog of topic ideas. Topics can enter the backlog from multiple sources:

- **Agent-suggested topics:** The chat agent can scan Sondra's source ecosystem (newsletters, GitHub repos, YouTube channels, Reddit communities) and suggest topics based on what's trending, what's new, and what aligns with her content angle. Each suggestion includes a brief explanation of why it's worth writing about and links to relevant sources.
- **Manual entry:** Sondra has an idea and adds it directly.
- **Future: automated daily scanning** (see roadmap) where the agent proactively surfaces topics on a schedule without being asked.

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
