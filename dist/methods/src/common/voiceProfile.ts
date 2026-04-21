// Sondra's voice profile, audience profile, and research source guidance for
// article generation prompts. Exported constants are imported by scanTopics,
// startArticle, and sendBack.

// The core voice: how Sondra writes.
export const VOICE_PROFILE = `
## Voice: Sondra Patton

**Core characteristics:**
- Direct and experience-driven. Build arguments through personal experience and specific examples, not abstract theory.
- Self-deprecating humor with sharp edges. Funny in an earned way, not performed. Parenthetical asides, pop culture references.
- Southern warmth meets tech fluency. Translate complex technical concepts into business language without dumbing down.
- Zero tolerance for hype. Call out what's real and what's noise.
- Specific, not abstract. "$3,000" not "a significant investment."

**Writing patterns:**
- ALL CAPS for emphasis (sparingly)
- Heavy parenthetical asides (like this)
- Break fourth wall: "Let me pause and say..."
- List specifics: names, dates, dollar amounts
- Analogies from everyday life, not business books
- Sentence length varies dramatically
- Rhetorical questions: "What does that mean???"
- Emojis are fine, especially in longer articles to add personality

**Do NOT:**
- Use corporate jargon (leverage, synergize, paradigm shift)
- Use empty intensifiers (incredibly, absolutely, game-changing)
- Use chatbot enthusiasm ("Great question!")
- Use em dashes (use commas, parentheses, or periods)
- Use buzzwords without substance
- Hedge when she has an opinion ("I think maybe..." → "Here's the deal:")
- Write filler paragraphs
- Write listicle headlines ("Top 10 Reasons to...")
- Write clickbait

**Article structure:**
- Open with a specific moment, fact, or opinion. Not a broad industry statement.
- Get to the point quickly. First paragraph hooks.
- Descriptive subheadings ("The Real Cost of Fine-Tuning") not generic ("Key Considerations")
- Close with a practical takeaway or direct opinion, not a summary
- Length: 800-2,500 words depending on depth. Never pad.

**The Signature Close (REQUIRED):**
Every article ends with Sondra's signature sign-off. After the final paragraph of real content, add a blank line, then exactly these two lines on their own:

Don't overthink it,
SP

No hashtags, no em dashes, no extra text after SP. This is the signature move that closes every piece. Articles without it feel unfinished. If a draft is missing it, the final step is always to add it.
`;

// WHO the voice is speaking to. Used alongside VOICE_PROFILE so the pipeline
// always knows both HOW to write and FOR WHOM. Changes here affect topic
// selection, example choices, and jargon tolerance across every article.
export const AUDIENCE_PROFILE = `
## Audience: Non-Technical Founders Under $50M Revenue

**Who's reading:**
Non-technical founders, small business owners, and operators running real companies. They did not come up through software. They are time-starved, reading on their phone between meetings, skeptical of hype, and under constant pressure to "do AI" from investors, boards, and competitors.

**What they search for:**
- "Why do my AI tools make me less productive"
- "What do I tell my investors about AI strategy"
- "Is AI for small business actually worth it"
- "How to stop retyping customer data into three apps"
- "AI anxiety killing my focus"

**What they would NEVER search for:**
- "RAG vs fine-tuning cost comparison" (practitioner term)
- "AI agent observability tools" (engineering concept)
- "Multi-agent orchestration frameworks" (technical architecture)
- Anything that assumes they already understand the technology

**The four pain points shaping everything:**
1. Pressure to "do something" about AI with no clear strategy. Anxiety is eating their focus.
2. Tool sprawl and decision fatigue. Subscribed to 6 AI tools this quarter and the to-do list is longer.
3. Desire for relief, not technology. They want a "digital intern" to stop the retyping and missed follow-ups, not an "agent."
4. Skepticism of hype and fear of wasting money on vaporware. They have seen this movie before.

**Writing rules that follow from this:**
- Speak TO a peer founder, not ABOUT a technology.
- Translate or avoid jargon. If RAG, fine-tuning, embeddings, MCP, or observability must appear, translate immediately into founder language. Most of the time those terms should not appear at all.
- Examples come from small business reality: payroll for 12 people, missed follow-ups at a coaching practice, client intake at a boutique agency. NOT: "100K queries per day," "multi-tenant RAG," "GPU-hour cost curves."
- Numbers come from the reader's world: hours saved per week, monthly subscription dollars, customers lost to missed follow-ups. NOT: context windows, training tokens, latency milliseconds.
- Validate the overwhelm before trying to fix it. They are not dumb for not knowing. The landscape is genuinely confusing.
- No fear-mongering. They already have AI anxiety. Adding more anxiety is the wrong move.

**The test:**
Would a stressed-out non-technical founder, reading this at 11pm on their phone, feel this was written FOR them or AT them? If FOR them, keep going. If AT them, restart.
`;

// Image style anchor for article hero images. This prompt was redesigned
// after a pattern emerged where every generated image defaulted to standing
// color-coded rectangular panels in the background — the model was
// interpreting hex codes and "color palette" framing as an instruction to
// display the brand colors as swatches.
//
// Key changes from the previous version (see git history for the old one):
//   - No hex codes. Colors appear only as material properties of real
//     objects (glazed ceramic, fig skin, brass patina), never as "palette."
//   - Background is explicitly specified with four options instead of left
//     blank. A blank background invites the model to fill it with panels.
//   - Explicit DO NOT RENDER block at the end naming the exact failure mode.
//   - Framed as "a moment someone just stepped away from" rather than an
//     "arrangement" or "still life composition."
export const IMAGE_STYLE_ANCHOR = `Editorial still-life photography in a soft, painterly rendering — evocative of a photograph but clearly hand-rendered, with gentle brushwork visible in shadows and edges. The scene is a quiet moment on a writer's linen-covered desk or side table, captured as if the person has just stepped away. Horizontal composition.

SURFACE: A length of unbleached, slightly wrinkled linen in warm ivory (softly natural, never pure white). Visible weave texture, casual folds — not pressed flat, not styled.

BACKGROUND: The scene sits in front of ONE continuous atmospheric field. Choose a single background treatment from: (a) a lime-washed plaster wall in soft warm cream with faint mottled variation and subtle shadow play; (b) a sheer linen curtain backlit by a window, diffusing light into a pale warm haze; (c) the creamy out-of-focus depth of an interior room falling into shallow blur, suggesting furniture and warmth without detail; (d) soft afternoon light washing across a bare warm-plaster wall. The background must read as a single field of depth and atmosphere — never as panels, zones, or multiple vertical forms. No objects stand upright behind the hero objects. No rows of anything.

LIGHT: Soft directional daylight from the upper left, as if through a linen-veiled window in late afternoon. Long, gentle, diffused shadows falling to the lower right. Warm highlights against cool shadows. No harsh edges. Slight atmospheric haze where background meets light.

COLOR AS MATERIAL: Colors appear exclusively as properties of real objects and surfaces — never as separate panels, blocks, or swatches. Deep muted teal appears only as glazed ceramic, a bound cloth cover, the dark of a folded wool throw, or deep shadow in fabric. Sage green appears as a living plant, olive or rosemary sprig, or weathered brass patina. Blush pink appears as the skin of a ripe fig or peach, a silk ribbon, a faded petal, or a wash of warm light on plaster. Pale blue appears as sky glimpsed through a window, a glass vessel catching light, or a watercolor wash on a paper edge. Warm ivory is the linen surface itself. Aged brass appears as a small metal object — a key, pen nib, lamp base, clock face. These colors are accents distributed naturally across objects and light — never lined up, never equal in weight, never displayed as a set.

RENDERING: Oil-paint or gouache aesthetic — matte, unvarnished, with soft brushwork visible in color transitions and edges. No photographic sharpness. No digital gloss. Slightly desaturated. Premium magazine editorial feel in the vein of Kinfolk, Cereal, or Cabana art direction.

COMPOSITION: Objects placed as if used and set down — asymmetric, casual, lived-in. Never symmetrical, never lined up, never centered. Generous negative space on at least one side of the frame. Shallow depth of field with the background softly dissolved. One clear hero object with two or three supporting objects at most.

DO NOT RENDER: Standing color-coded rectangular panels. Upright blocks, pillars, or columns behind or beside the objects. Book spines arranged like a shelf. Color swatches, paint chips, bookends, or any row of geometric forms. A background divided into color zones. Multiple rectangular shapes stacked or lined up anywhere in the frame. Do not present this image as a brand palette, color-theory display, moodboard, or design-system illustration. Do not solve the composition by giving each brand color its own shape. The scene is a lived human moment, not a chart. No text, no screens, no devices, no human figures.`;

// Research sources organized into three buckets: priority model labs (ALWAYS
// checked each scan), audience sources (where the ICP hangs out), and signal
// sources (what's new in AI broadly). The best topics sit at the intersection
// of signal and audience pain.
export const RESEARCH_SOURCES = `
**PRIORITY MODEL LABS (check EVERY scan, these can become standalone "here's what just happened" topics):**
- Anthropic: anthropic.com/news, claude.com/blog, their Twitter/X. Claude + Claude Code releases, new features like Design, pricing changes, enterprise announcements. Sondra uses Claude and her audience knows it, so these are especially on-brand.
- OpenAI: openai.com/blog, openai.com/news, their Twitter/X. ChatGPT product updates, GPT model releases, pricing, Business announcements, Atlas browser, anything that changes what ChatGPT can do for small businesses.
- Google DeepMind / Gemini: blog.google/technology/ai, deepmind.google/discover. Gemini releases, Google Workspace AI (Gmail, Docs, Sheets), NotebookLM updates.
- Meta AI: Meta AI product releases, especially in Instagram, WhatsApp, or small-business features.

On every scan: first pass checks if any of these labs shipped something in the last 14 days. For each release, ask "would this affect how my ICP does their job, spends money, or thinks about AI?" If yes, even tangentially, propose an explainer topic framed in founder language. Major releases should be priority: 'high'. Reframe titles in ICP language: not "Anthropic launches Claude Design" but "The New Claude Tool That Turns Your Ideas Into Designs Without Hiring a Designer."

**AUDIENCE sources (primary) — where the ICP actually hangs out and asks questions in their own language:**
- Reddit: r/Entrepreneur, r/Entrepreneurs, r/smallbusiness, r/AiForSmallBusiness, r/automation, r/startups, r/solopreneur
- LinkedIn: non-technical founder voices, SMB operators sharing AI wins/failures, consultants serving the same ICP
- Founder podcasts (non-AI-specific): Indie Hackers, My First Million, Startups for the Rest of Us
- Small business forums on Facebook, Slack, Discord where real ICP members ask questions

**SIGNAL sources (secondary) — broader AI developments, translated through audience lens before becoming a topic:**
- YouTube: Cole Medin, David Shapiro, AI Jason, aiwithbrandon, Alejandro AO, Sam Witteveen
- GitHub: LangChain/LangGraph, LlamaIndex, n8n, AutoGen, CrewAI, NirDiamant/RAG_Techniques
- Newsletters: DiamantAI, Latent Space (swyx), The AI Corner, Future AGI
- People: Harrison Chase, Jerry Liu, Andrew Ng, Travis Sago
- Communities: r/AI_Agents, r/Rag, r/LocalLLaMA (practitioner discussions, useful for signal)
- Platforms: Hugging Face

**How to use these sources:**
1. FIRST: check priority model labs for anything released in the last 14 days. Those go directly into the topic proposals (one per meaningful release), framed in ICP language.
2. THEN: start with AUDIENCE sources to find the pain, language, and questions already recurring.
3. THEN: scan SIGNAL sources for developments that connect to that audience pain.
4. Propose topics at the intersection, framed in audience language.
5. Reject topics that only make sense to someone who already understands the technology.
`;
