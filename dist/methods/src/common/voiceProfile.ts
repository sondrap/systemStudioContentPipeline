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

export const IMAGE_STYLE_ANCHOR = `Soft-focus editorial still life composition in a painterly, slightly impressionistic rendering style, clearly not a photograph but evocative of one. Objects arranged on a pale linen surface (#F7F4F2). Soft directional window light from the upper left, casting long gentle shadows. Shallow depth of field with the background dissolving into a warm creamy blur. Color palette strictly restricted to: deep muted teal (#365367), sage green (#577267), blush pink (#ECD8DC), pale blue (#D4E4F1), warm linen white (#F7F4F2), and natural brass/gold. Premium editorial magazine aesthetic. Matte surfaces, no gloss. Generous negative space. Horizontal composition. No text, no screens, no devices, no human figures.`;

// Research sources organized into two buckets: audience sources (where the ICP
// hangs out, what they're asking) and signal sources (what's new in AI).
// The best topics sit at the intersection of these two.
export const RESEARCH_SOURCES = `
**AUDIENCE sources (primary) — where the ICP actually hangs out and asks questions in their own language:**
- Reddit: r/Entrepreneur, r/Entrepreneurs, r/smallbusiness, r/AiForSmallBusiness, r/automation, r/startups, r/solopreneur
- LinkedIn: non-technical founder voices, SMB operators sharing AI wins/failures, consultants serving the same ICP
- Founder podcasts (non-AI-specific): Indie Hackers, My First Million, Startups for the Rest of Us
- Small business forums on Facebook, Slack, Discord where real ICP members ask questions

**SIGNAL sources (secondary) — what's new in AI, must be translated through audience lens before becoming a topic:**
- YouTube: Cole Medin, David Shapiro, AI Jason, aiwithbrandon, Alejandro AO, Sam Witteveen
- GitHub: LangChain/LangGraph, LlamaIndex, n8n, AutoGen, CrewAI, NirDiamant/RAG_Techniques
- Newsletters: DiamantAI, Latent Space (swyx), The AI Corner, Future AGI
- People: Harrison Chase, Jerry Liu, Andrew Ng, Travis Sago
- Communities: r/AI_Agents, r/Rag, r/LocalLLaMA (practitioner discussions, useful for signal)
- Platforms: Hugging Face

**How to use these sources:**
1. Start with AUDIENCE sources to find the pain, language, and questions already recurring.
2. Scan SIGNAL sources for developments that connect to that audience pain.
3. Propose topics at the intersection, framed in audience language.
4. Reject topics that only make sense to someone who already understands the technology.
`;
