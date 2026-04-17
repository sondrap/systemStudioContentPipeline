import { mindstudio, auth, db } from '@mindstudio-ai/agent';
import { Topics } from './tables/topics';
import { Articles } from './tables/articles';
import { Users } from './tables/users';
import { AUDIENCE_PROFILE, RESEARCH_SOURCES } from './common/voiceProfile';

interface TopicSource {
  url: string;
  title: string;
  date?: string;
}

interface TopicSuggestion {
  title: string;
  description: string;
  reasoning: string;
  priority: 'high' | 'normal';
  sources: TopicSource[];
  suggestedKeyword: string;
  seoOpportunity: 'high' | 'moderate' | 'low';
}

export async function scanTopics() {
  // Allow both admin users and system (cron) triggers
  auth.requireRole('admin', 'system');

  // Fetch existing topics, recent articles, and editorial direction
  const [existingTopics, recentArticles, allUsers] = await db.batch(
    Topics.filter(t => t.status === 'backlog'),
    Articles.filter(a => a.created_at > db.ago(db.days(90))),
    Users.filter(u => u.editorialDirection !== null),
  );

  const existingTitles = existingTopics.map(t => t.title);
  const recentArticleTitles = recentArticles.map(a => a.title);
  // Get editorial direction from the first admin user who has one set
  const editorialDirection = allUsers.find(u => u.editorialDirection)?.editorialDirection || '';

  // Fire-and-forget: return immediately, scan runs in the background
  mindstudio.runTask<{ topics: TopicSuggestion[] }>({
    prompt: `You are a trend analyst for Sondra Patton, a content strategist who helps non-technical founders navigate AI without having to become technical. Every topic you propose must be something her ideal customer would actually stop scrolling for, Google at 11pm on their phone, or nod along to while reading. Your job is not to surface what's interesting in AI. It is to find topics where the ICP's real pain intersects with something genuinely happening in AI.

${AUDIENCE_PROFILE}

YOUR CORE JOB: Find the intersection of AUDIENCE PAIN and AI SIGNAL.

The best topics sit at the overlap of two things:
1. A real, recurring frustration the ICP is already experiencing and talking about (audience sources).
2. A real, recent shift in the AI world that connects to that frustration (signal sources).

Topics from audience pain alone become generic small-business advice. Topics from AI signal alone become practitioner content the ICP will never read. The sweet spot combines both.

${RESEARCH_SOURCES}

Research process:
1. START WITH AUDIENCE. Search the Reddit communities in the audience sources (r/Entrepreneur, r/smallbusiness, r/AiForSmallBusiness, r/automation, r/startups). Read what founders are actually posting this month. Capture their exact language. What pain is recurring? What questions are getting asked multiple times? What are they frustrated with?
2. THEN SCAN SIGNAL. Search for recent AI developments (last 6 weeks) across the signal sources and broader AI news. Cast a wide net.
3. LOOK FOR INTERSECTIONS. Where does a signal connect to audience pain? A new pricing model from Anthropic (signal) connects to the "subscription graveyard" frustration (audience). A shift toward agentic workflows (signal) connects to the "I just want my afternoon back" desire (audience).
4. FRAME IN AUDIENCE LANGUAGE. The title and description must use the language the ICP uses, not the language a practitioner would use. Never lead with "AI Agent Observability" when you could lead with "Why You Can't Tell If Your AI Tools Are Actually Working."
5. Scrape the most relevant sources for supporting detail.
6. Return 3-5 intersection topics.

What makes a GOOD topic for this audience:
- "Why Your 6 AI Subscriptions Aren't Saving You Time (And How to Cut 4 of Them)" — audience pain (tool sprawl) + signal (pricing model shifts across 4 platforms) + actionable framing
- "What to Tell Your Board When They Ask About Your 'AI Strategy'" — audience pain (investor pressure) + signal (recent founder survey data) + plain-language script
- "The 'Digital Intern' Test: How to Tell If an AI Tool Will Actually Save You Time Before You Buy" — audience pain (subscription fatigue) + signal (new evaluation frameworks) + practical filter
- "Why Every Founder You Know Is Anxious About AI Right Now" — audience pain (AI anxiety) + signal (recent Gartner / Ramp / McKinsey data on adoption) + validation first

What makes a BAD topic for this audience:
- "The Real State of AI Agent Observability in 2026" — practitioner term, ICP would never search this
- "Fine-Tuning vs RAG: The Cost Comparison" — technical framing, assumes ICP already understands both concepts
- "How to Build Multi-Agent Workflows in LangGraph" — engineering content, wrong audience entirely
- "Top 10 AI Tools for Small Business" — listicle, ICP is drowning in these already
- "ChatGPT Just Announced Feature X" — single news item, not a pattern, and reactive

The test every topic must pass:
Would a stressed-out non-technical founder, reading the headline in the middle of a busy day, think "yes, that's me, I need to read that"? If the topic requires them to already understand a technical concept, REJECT IT.

${editorialDirection ? `CURRENT EDITORIAL DIRECTION (from Sondra, follow this closely):
${editorialDirection}

` : ''}EXISTING TOPICS TO AVOID (already in the backlog):
${existingTitles.map(t => `- ${t}`).join('\n') || '(none)'}

RECENT ARTICLES TO AVOID REPEATING:
${recentArticleTitles.map(t => `- ${t}`).join('\n') || '(none)'}

Writing rules:
- Plain, direct prose. No bullet points inside text fields.
- No em dashes, no exclamation marks, no filler phrases.
- No emojis. No hype language.
- Titles must use the ICP's language. Avoid practitioner terms (RAG, fine-tuning, observability, agentic, orchestration, embeddings, MCP) in titles unless the word is being explicitly translated.
- Descriptions: 2-3 sentences max. Frame both the audience pain and the signal that connects to it. Written so a non-technical founder would understand.
- Reasoning: explain (a) what audience pain this connects to with a real quote or reference, (b) what AI signal supports it with specific evidence, and (c) why the intersection makes this a topic the ICP would actually read.
- sources: include a mix of AUDIENCE sources (Reddit threads, LinkedIn posts, forum discussions showing the pain is real) and SIGNAL sources (news, research, tool announcements). Aim for at least one audience source per topic. For each source, include the URL, title, and date if findable.
- Set priority to "high" only if the pain is acute right now and the signal is a clear inflection point. Most topics should be "normal."

SEO keyword research (do this for each topic):
- For each topic, identify the best focus keyword phrase (2-4 words) that a non-technical founder would actually type into Google. Think in the ICP's language. "AI tool fatigue" beats "AI tool stack optimization." "AI anxiety small business" beats "enterprise AI governance."
- Search Google for this keyword phrase and assess: How many high-quality results exist? Are the top results from practitioners or from founder-audience publications? Is there room for a plain-language take?
- Rate the SEO opportunity as "high" (low competition or strong audience intent), "moderate" (decent opportunity but competitive), or "low" (saturated or low search interest).
- Return the suggestedKeyword and seoOpportunity for each topic.`,

    input: {
      focusAreas: ['AI trends affecting digital businesses', 'patterns in AI adoption', 'AI tools and pricing shifts'],
      recencyWindow: 'last 6 weeks',
      existingTopicCount: existingTitles.length,
    },

    tools: ['searchGoogle', 'scrapeUrl'],

    model: 'claude-4-6-sonnet',
    maxTurns: 20,

    structuredOutputExample: {
      topics: [
        {
          title: 'Why Your 6 AI Subscriptions Aren\'t Saving You Time (And How to Cut 4 of Them)',
          description: 'Founders across r/smallbusiness and r/AiForSmallBusiness are venting about subscribing to six AI tools last quarter and having a longer to-do list than before. Meanwhile, four major platforms restructured their pricing models in the same quarter toward outcome-based billing. The two trends together mean the old AI stack is about to get even more expensive to keep, and the case for consolidation is suddenly quantifiable.',
          reasoning: 'AUDIENCE PAIN: Reddit posts like "I am very confused because I have subscribed to 6 AI tools this quarter and the to-do list is longer than ever" are recurring across r/AiForSmallBusiness and r/smallbusiness this month. The language "tool sprawl" and "subscription graveyard" is appearing repeatedly. AI SIGNAL: HubSpot, Intercom, Salesforce, and Anthropic all shifted pricing models in the last six weeks toward usage-based billing. INTERSECTION: The pain (tool sprawl) is about to get worse (pricing changes), which makes this a real "you need to act now" piece for the ICP, not just a venting article.',
          priority: 'high' as const,
          sources: [
            { url: 'https://www.reddit.com/r/AiForSmallBusiness/comments/1rqkssh/', title: 'Is anyone else drowning in AI tools but actually getting less done?', date: 'Apr 2026' },
            { url: 'https://www.reddit.com/r/smallbusiness/comments/1klj5e1/', title: 'Is it just me that doesn\'t want any AI involved?', date: 'Mar 2026' },
            { url: 'https://example.com/hubspot-ai-pricing', title: 'HubSpot switches AI pricing to per-resolution model', date: 'Apr 2026' },
            { url: 'https://example.com/anthropic-metered', title: 'Anthropic moves Claude to metered billing', date: 'Apr 2026' },
          ],
          suggestedKeyword: 'AI tool fatigue',
          seoOpportunity: 'high' as const,
        },
        {
          title: 'What to Say When Your Board Asks About Your \'AI Strategy\' (And You Don\'t Have One)',
          description: 'A Fortune survey of 350 public-company CEOs found 66% are being pressured on AI strategy, and LinkedIn is full of founders venting about the same thing. The honest answer (selectively automate your most painful bottlenecks using tools that already exist) sounds boring but is actually what the best operators are doing. Here\'s the script.',
          reasoning: 'AUDIENCE PAIN: Founders on r/Entrepreneur and LinkedIn posts repeatedly describe the pressure from investors and boards to have an "AI strategy" they don\'t have. This is one of the most common confessions in small business founder communities right now. AI SIGNAL: The Fortune CEO survey and recent Ramp AI Index data provide the quantitative backup. INTERSECTION: The ICP needs permission to give a non-flashy answer to a high-pressure question, and Sondra can provide that permission with real data to back it.',
          priority: 'high' as const,
          sources: [
            { url: 'https://www.reddit.com/r/Entrepreneur/comments/1r9ofqk/', title: 'As a small business owner, AI felt like it wasn\'t for me', date: 'Mar 2026' },
            { url: 'https://www.linkedin.com/pulse/ai-strategy-pressure-founders', title: 'Why the pressure to do AI is breaking more startups than it helps', date: 'Apr 2026' },
            { url: 'https://fortune.com/ai-ceo-survey', title: '66% of CEOs are freezing hiring while betting billions on AI', date: 'Mar 2026' },
          ],
          suggestedKeyword: 'AI strategy small business',
          seoOpportunity: 'moderate' as const,
        },
      ],
    },
  }).then(async (result) => {
    if (!result.parsedSuccessfully || !result.output?.topics?.length) {
      console.error('Topic scan failed to produce results:', result.outputRaw);
      return;
    }

    // Add suggestions to the backlog
    const newTopics = await Topics.push(
      result.output.topics.map(suggestion => {
        const sources = suggestion.sources || [];
        return {
          title: suggestion.title,
          description: suggestion.description,
          sourceUrls: sources.map(s => s.url),
          sources,
          priority: suggestion.priority === 'high' ? 'high' as const : 'normal' as const,
          status: 'backlog' as const,
          suggestedBy: 'agent' as const,
          reasoning: suggestion.reasoning,
          suggestedKeyword: suggestion.suggestedKeyword || undefined,
          seoOpportunity: (['high', 'moderate', 'low'].includes(suggestion.seoOpportunity) ? suggestion.seoOpportunity : 'moderate') as 'high' | 'moderate' | 'low',
        };
      })
    );

    console.log(`Topic scan complete: added ${newTopics.length} topics to backlog.`);
  }).catch((err) => {
    console.error('Topic scan failed:', err);
  });

  // Return immediately — the scan continues in the background
  return { status: 'scanning' };
}
