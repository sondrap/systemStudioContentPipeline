import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { Topics } from './tables/topics';
import { VOICE_PROFILE, AUDIENCE_PROFILE, RESEARCH_SOURCES } from './common/voiceProfile';
import { loadEditorialMemoryDigest } from './common/editorialMemory';
import { pickImageConcept, renderStillLife, ImageConcept } from './common/generateStillLife';
import { reviewSeoCritique } from './common/seoCritique';
import { reviewDraftCritique } from './common/draftCritique';
import { generateAllLinkedInPosts } from './common/linkedInPosts';
import { applyCritiqueFeedback, hasActionableIssues } from './common/applyCritiqueFeedback';
import { normalizeSignoff } from './common/signoff';
import { stripPaywalledLinks } from './common/paywall';
import { analyzeKeywordPlacement, fixUpMissingKeywordPlacements } from './common/verifyKeywordPlacement';

export async function startArticle(input: {
  topicId?: string;
  title?: string;
  description?: string;
  articleType?: 'thought-leadership' | 'educational' | 'commentary' | 'mixed';
}) {
  auth.requireRole('admin');

  let title = input.title || '';
  let description = input.description || '';
  let topicKeyword = '';

  // If starting from a topic, pull topic details
  if (input.topicId) {
    const topic = await Topics.get(input.topicId);
    if (!topic) throw new Error('Topic not found.');
    title = title || topic.title;
    description = description || topic.description || '';
    topicKeyword = topic.suggestedKeyword || '';

    // Mark topic as in-pipeline
    await Topics.update(input.topicId, { status: 'in-pipeline' });
  }

  if (!title.trim()) {
    throw new Error('Article needs a title or topic.');
  }

  // Create article in researching state
  const article = await Articles.push({
    title: title.trim(),
    status: 'researching',
    topicId: input.topicId,
    articleType: input.articleType || 'mixed',
  });

  // Link topic to article
  if (input.topicId) {
    await Topics.update(input.topicId, { articleId: article.id });
  }

  // Fire-and-forget: research phase
  runResearchAndDraft(article.id, title, description, topicKeyword).catch(async (err) => {
    console.error('Research/draft pipeline failed:', err);
    await Articles.update(article.id, {
      status: 'review',
      revisionNotes: 'Pipeline error: ' + (err?.message || 'Unknown error. Try again.'),
    });
  });

  return { article };
}

// Background pipeline: research → draft → image → review
async function runResearchAndDraft(articleId: string, title: string, description: string, topicKeyword: string = '') {
  // --- RESEARCH PHASE ---
  console.log(`[${articleId}] Starting research for: ${title}${topicKeyword ? ` (keyword: ${topicKeyword})` : ''}`);

  const researchResult = await mindstudio.runTask<{
    summary: string;
    keyFindings: string[];
    sources: { url: string; title: string; relevance: string }[];
    quotes: { text: string; attribution: string }[];
    competitorInsights: {
      topArticles: { url: string; title: string; focusKeyword?: string; wordCount?: number }[];
      commonKeywords: string[];
      gaps: string[];
    };
  }>({
    prompt: `You are a research assistant for Sondra Patton, a content strategist who helps non-technical founders navigate AI without having to become technical. Your job is to compile a research brief that supports an article written FOR her audience, not FOR AI practitioners.

${AUDIENCE_PROFILE}

Research deeply, not widely. Prioritize understanding 5 quality sources over skimming 20. Focus on information that lands with a non-technical founder reading at 11pm on their phone.

${RESEARCH_SOURCES}

Research process:
1. Search AUDIENCE sources first. What are founders actually saying on Reddit, LinkedIn, and forums about this topic? Capture their exact language and concrete frustrations. The article needs to sound like it was written by someone who listened to them, not at them.
2. Search SIGNAL sources for recent developments, data, and expert commentary that give the article credibility.
3. Look for small-business-relevant examples. Prefer: "a coaching business with 200 clients," "a 12-person agency," "a solo consultant who lost a deal to a missed follow-up." Avoid: "a Fortune 500 telecom saved $2.3M," "100,000 queries per day," "enterprise compliance teams."
4. Scrape the most relevant pages for full content.
5. PREFER FREELY-ACCESSIBLE SOURCES. When the same fact or quote is available from both a paywalled publication (Forbes, WSJ, NYT, Bloomberg, FT, HBR, The Atlantic, Economist, Business Insider, Wired, etc.) AND a freely-accessible source (primary research, press release, company blog, freely-accessible news coverage), always capture the free one. The drafting agent will use these URLs as inline citations and we cannot send readers to paywalls. If a paywalled source is unavoidable because it's the only record of the fact, still include it but also note "[paywalled]" in the relevance field so the drafting agent knows to handle it carefully.

COMPETITOR ANALYSIS: Also analyze the top 3-5 Google results for this topic${topicKeyword ? ` and for the keyword "${topicKeyword}"` : ''}. For each competing article, note the URL, title, apparent focus keyword, and approximate word count. Then identify:
- Common keywords used across competing articles
- Content gaps: angles, questions, or subtopics that competitors are NOT covering well, especially ones where a plain-language founder perspective would stand out over practitioner content.

Be direct and factual. No filler, no em dashes, no emojis in the brief.`,
    input: {
      topic: title,
      context: description,
      targetKeyword: topicKeyword || undefined,
    },
    tools: ['searchGoogle', 'scrapeUrl'],
    structuredOutputExample: {
      summary: 'Two to three sentence overview of the key findings',
      keyFindings: [
        'First major finding with specific details',
        'Second finding with data or expert opinion',
        'Third finding addressing practical implications',
      ],
      sources: [
        { url: 'https://example.com/article', title: 'Article Title', relevance: 'Why this source matters' },
      ],
      quotes: [
        { text: 'A relevant direct quote from a source', attribution: 'Author Name, Source' },
      ],
      competitorInsights: {
        topArticles: [
          { url: 'https://example.com/competitor', title: 'Competitor Article Title', focusKeyword: 'target keyword', wordCount: 1500 },
        ],
        commonKeywords: ['keyword one', 'keyword two', 'keyword three'],
        gaps: ['No articles address the cost implications for small businesses', 'Most articles are written for developers, not founders'],
      },
    },
    model: 'claude-4-6-sonnet',
    maxTurns: 15,
  });

  if (!researchResult.parsedSuccessfully) {
    console.error('Research failed to produce structured output:', researchResult.outputRaw);
    throw new Error('Research agent failed to produce structured results.');
  }

  // Save research brief (including competitor insights)
  await Articles.update(articleId, {
    researchBrief: researchResult.output,
    focusKeyword: topicKeyword || undefined,
    status: 'drafting',
  });

  console.log(`[${articleId}] Research complete. Starting draft.`);

  // --- DRAFT PHASE ---
  const brief = researchResult.output;

  // Load Sondra's accumulated editorial preferences (corrections from past
  // Send Back revisions). The drafting prompt includes them so the writer
  // inherits her taste without her having to correct the same thing twice.
  // Stages relevant to drafting: drafting, voice, structure, links, general.
  const editorialMemoryDigest = await loadEditorialMemoryDigest({
    stages: ['drafting', 'voice', 'structure', 'links', 'general'],
  });

  const { content: articleContent } = await mindstudio.generateText({
    message: `Write a blog article based on the research brief below.

## Topic
${title}

## Research Brief
Summary: ${brief.summary}

Key Findings:
${brief.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Sources:
${brief.sources.map(s => `- ${s.title} (${s.url}): ${s.relevance}`).join('\n')}

Quotes:
${brief.quotes.map(q => `- "${q.text}" — ${q.attribution}`).join('\n')}

${brief.competitorInsights ? `## Competitor Analysis
Top competing articles target these keywords: ${brief.competitorInsights.commonKeywords?.join(', ') || 'n/a'}
Content gaps to exploit (angles competitors miss): ${brief.competitorInsights.gaps?.join('; ') || 'n/a'}` : ''}

${topicKeyword ? `## SEO Target — REQUIRED

Primary focus keyword: "${topicKeyword}"

This is NOT a suggestion. The article MUST include this exact phrase in ALL of the following locations. Not optional. Not "if it fits." If the article would read awkwardly with the keyword in one of these locations, rewrite the sentence so it reads naturally WITH the keyword rather than dropping the keyword.

Required placements:
1. **Title.** The exact phrase "${topicKeyword}" (or a very minor variant like singular/plural, or "your" instead of "the") must appear in the article title.
2. **First 150 words.** The exact phrase must appear in the opening — ideally in the first two paragraphs, definitely within the first 150 words.
3. **Excerpt.** The excerpt (the 1-2 sentence hook at the top separated by ---) must contain the exact phrase.
4. **At least one H2 heading.** One of the ## section headings must include the phrase or a close variant.
5. **Body, 2-4 additional times.** Throughout the body, the phrase should appear 2-4 more times naturally. Keyword density should land between 0.5% and 3% of total word count. Counting for a 1,500-word article: 7 to 45 appearances total across title + body. Aim for 4-6 total.

How to weave without forcing:
- If a sentence about "AI tools" would work with "AI tools that aren't saving time" — use the full phrase instead.
- If a section heading says "Why The Tools Feel Broken" — change it to "Why Your AI Tools Aren't Saving You Time".
- Don't paraphrase the keyword ("AI tools that eat your day" ≠ "AI tools not saving time"). Use the EXACT phrase where listed above; paraphrased variants only count as additional mentions on top of the required exact placements.

Non-negotiable rule: every article must be drafted with the keyword already in the title, excerpt, intro, at least one heading, and at least 3-5 times in the body. This is checked programmatically after drafting — articles missing the keyword in the required locations are sent back for rewrite.` : ''}

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

${editorialMemoryDigest}

## Audience Check Before You Write
Before you write a word, picture the reader: a non-technical founder on their phone between meetings. If the opening paragraph would make them think "this isn't for me, I'm not technical enough," restart.

Specifically:
- Lead with the reader's pain or situation, not with a technical concept.
- Examples come from small business reality. Payroll for a 12-person team. Follow-up emails lost between client calls. Not enterprise or ML engineering scenarios.
- Every practitioner term (RAG, fine-tuning, embeddings, observability, orchestration) gets translated immediately into founder language, or replaced entirely with the business outcome it produces.
- Numbers are in the reader's world (hours per week, dollars per month, deals lost), not practitioner units (tokens, GPU-hours, context windows).
- Validate their overwhelm before instructing. The AI landscape IS confusing. Acknowledge that before trying to fix it.

## Format Requirements
- Write in Markdown. Use ## for major sections, ### for subsections. Never use # (the title is separate).
- Short punchy paragraphs (2-4 sentences).
- Include a compelling excerpt (1-2 sentences) at the very beginning, separated by ---.
- **Close every article with Sondra's signature sign-off.** The very last thing in the article body, after the final content paragraph, must be a blank line and then these two lines on their own:

  Don't overthink it,
  SP

  This is non-negotiable. Never put the sign-off mid-article. Never write "Don't overthink it, SP" on one line. The comma goes after "it" with a line break, then "SP" alone on the next line.
- End with --- followed by suggested tags from: strategy, ai-adoption, operations, case-study, tools, leadership, methodology
- And an ogDescription (max 160 chars)
- **Link to sources naturally.** When referencing specific data, quotes, surveys, or claims from the research, link to the source inline using markdown link syntax: \`[like this](https://example.com/source)\`. Aim for 2-5 outbound links across the article. The research brief above contains the URLs. These links build credibility and SEO authority. Do not pile links in a "sources" section at the end. Weave them into the prose where the fact or quote appears.
- **Avoid paywalled sources.** Never link to paywalled publications (Forbes, WSJ, NYT, Bloomberg, FT, Harvard Business Review, The Atlantic, Economist, Business Insider, Wired, Substack subscriber-only posts, Medium members-only posts). Readers clicking expecting value will hit a subscribe wall. If the research brief contains a paywalled source, cite the underlying primary source or a freely-accessible equivalent (the original research paper, press release, company blog, or a reputable free alternative covering the same story). If there is genuinely no free alternative and the paywalled source is the only record of the fact, reference the publication by name in prose without a link rather than sending readers to a paywall.

## Output format
excerpt: [1-2 sentence hook]
---
[article body in markdown]
---
tags: [comma-separated tags]
ogDescription: [max 160 chars for social sharing]`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.6,
      maxResponseTokens: 16000,
    },
  });

  // Parse the structured output
  const parts = articleContent.split('---').map((s: string) => s.trim());
  let excerpt = '';
  let body = articleContent;
  let tags: string[] = [];
  let ogDescription = '';

  if (parts.length >= 3) {
    // Extract excerpt from first section
    const excerptLine = parts[0].replace(/^excerpt:\s*/i, '').trim();
    excerpt = excerptLine;
    body = parts.slice(1, -1).join('\n\n---\n\n').trim();

    // Parse tags and ogDescription from last section
    const lastPart = parts[parts.length - 1];
    const tagMatch = lastPart.match(/tags:\s*(.+)/i);
    const ogMatch = lastPart.match(/ogDescription:\s*(.+)/i);
    if (tagMatch) tags = tagMatch[1].split(',').map(t => t.trim().toLowerCase());
    if (ogMatch) ogDescription = ogMatch[1].trim();
  }

  // Generate slug from title
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  const wordCount = body.split(/\s+/).filter(Boolean).length;

  // Save initial draft
  await Articles.update(articleId, {
    body,
    excerpt,
    slug,
    tags,
    ogDescription,
    wordCount,
    status: 'drafting',
  });

  console.log(`[${articleId}] Draft complete (${wordCount} words). Running SEO pass.`);

  // --- SEO OPTIMIZATION PASS ---
  const { content: seoContent } = await mindstudio.generateText({
    message: `You are an SEO editor for a blog targeting founders and CEOs of digital businesses. Your job is to optimize an existing article for search without changing the voice or making it sound like SEO spam.

## Article Title
${title}

## Article Body
${body}

## Current Excerpt
${excerpt}

## Current Tags
${tags.join(', ')}

## Current OG Description
${ogDescription}

${topicKeyword ? `## Focus Keyword — LOCKED

The focus keyword for this article is already set: "${topicKeyword}"

This is LOCKED. Do not change it. Do not suggest a different keyword. Your FOCUS_KEYWORD output MUST be exactly "${topicKeyword}".

Your job in this pass is NOT to pick a keyword. It's to verify the article correctly uses the locked keyword everywhere it needs to appear and FIX the article if it doesn't.

## Mandatory Keyword Placement Checklist

Before returning the optimized article, verify every one of these is true. If any fails, rewrite the affected element to make it true:

- [ ] Title contains "${topicKeyword}" (or a minor variant: singular/plural, "your" vs "the"). If the current title doesn't, rewrite it to include the exact phrase.
- [ ] Excerpt contains "${topicKeyword}". If not, rewrite the excerpt.
- [ ] OG Description contains "${topicKeyword}". If not, rewrite it.
- [ ] First 150 words of the body contain "${topicKeyword}". If not, rewrite the opening paragraphs.
- [ ] At least one ## heading contains "${topicKeyword}" or a close variant. If not, rewrite one heading.
- [ ] The body as a whole contains "${topicKeyword}" at least 4 times total (title + headings + body counts toward this). If not, find 1-2 more natural placements.

None of these placements are optional. If the phrase reads awkwardly in a given spot, rewrite the sentence to read naturally WITH the phrase rather than dropping the phrase.

` : `## Focus Keyword

No focus keyword is pre-set for this article. Identify the single best keyword phrase (2-4 words) someone non-technical would actually type into Google to find this article.

Then verify all the same mandatory placements apply: title, excerpt, OG description, first 150 words, at least one H2 heading, and 4+ total appearances in title + body combined.

`}## Your Other Tasks

1. **Keep the title compelling and human** — still a title someone would click on, just with the focus keyword woven in.

2. **Improve heading structure** so ## headings use natural keyword variations and related subtopic phrases where appropriate. Don't force keywords into every heading.

3. **Write the OG description between 140 and 160 characters.** This is critical. Shorter than 140 wastes search snippet real estate; longer than 160 gets truncated. Count carefully. MUST include the focus keyword naturally (see checklist above). Compelling enough that someone scrolling search results wants to click.

4. **Review the body.** Beyond the mandatory keyword placements above, add internal context or clarifying sentences only if they help the article rank for related queries. Do NOT add fluff, filler paragraphs, or unnatural keyword repetitions.

5. **Suggest tags** from this list that genuinely fit: strategy, ai-adoption, operations, case-study, tools, leadership, methodology, roi, automation, data, implementation

## Rules
- Do not change Sondra's voice or tone. She writes in plain, direct language.
- Do not add em dashes, emojis, or hype language.
- Do not add "In this article, we'll explore..." or similar SEO filler.
- Do not make the article longer just for SEO. Every sentence should earn its place.
- Keep paragraphs short (2-4 sentences).
- **Preserve the signature sign-off.** The original article ends with a blank line and then "Don't overthink it," on one line and "SP" on the next. This must remain the VERY LAST thing in the optimized article body. Never move it, never merge it, never write it as a single line. If the input article is missing the sign-off, add it at the end.

## Output Format
Return the optimized article in this exact format:

TITLE: [optimized title]
FOCUS_KEYWORD: [2-4 word primary keyword]
EXCERPT: [1-2 sentence excerpt]
OG_DESCRIPTION: [140-160 chars, no shorter, no longer]
TAGS: [comma-separated]
---
[full optimized article body in markdown]`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.3,
      maxResponseTokens: 16000,
    },
  });

  // Parse SEO-optimized output
  let seoTitle = title;
  let seoExcerpt = excerpt;
  let seoOgDescription = ogDescription;
  let seoTags = tags;
  let seoBody = body;
  let focusKeyword = '';

  const seoParts = seoContent.split('---');
  if (seoParts.length >= 2) {
    const header = seoParts[0];
    const titleMatch = header.match(/TITLE:\s*(.+)/i);
    const keywordMatch = header.match(/FOCUS_KEYWORD:\s*(.+)/i);
    const excerptMatch = header.match(/EXCERPT:\s*(.+)/i);
    const ogMatch = header.match(/OG_DESCRIPTION:\s*(.+)/i);
    const tagsMatch = header.match(/TAGS:\s*(.+)/i);

    if (titleMatch) seoTitle = titleMatch[1].trim();
    if (keywordMatch) focusKeyword = keywordMatch[1].trim();
    if (excerptMatch) seoExcerpt = excerptMatch[1].trim();
    if (ogMatch) seoOgDescription = ogMatch[1].trim();
    if (tagsMatch) seoTags = tagsMatch[1].split(',').map(t => t.trim().toLowerCase());

    seoBody = seoParts.slice(1).join('---').trim();
  }

  // Normalize the signature sign-off: remove any mid-article instances and
  // guarantee the article ends with exactly the right sign-off. This runs
  // after the AI stages as a belt-and-suspenders safety net so no article
  // ever ships without the canonical close, no matter what the model does.
  seoBody = normalizeSignoff(seoBody);

  // Strip any paywalled outbound links the drafting agent snuck in despite
  // the prompt guidance. Link text is preserved as plain prose so the
  // attribution stays but the reader doesn't get sent to a subscribe wall.
  const { body: strippedBody, strippedUrls } = stripPaywalledLinks(seoBody);
  seoBody = strippedBody;
  if (strippedUrls.length > 0) {
    console.log(`[${articleId}] Stripped ${strippedUrls.length} paywalled link(s) from draft`);
  }

  // Lock the focus keyword to the topic keyword when one was set. The SEO
  // pass is told not to change it, but we enforce here as belt-and-suspenders
  // so the rest of the pipeline works from the original intended keyword.
  if (topicKeyword && topicKeyword.trim().length > 0) {
    focusKeyword = topicKeyword;
  }

  // Verify the focus keyword actually appears in all the places it should.
  // If the SEO pass left gaps (title missing keyword, keyword not in intro,
  // no heading containing it, etc.), run a targeted fix-up pass rather than
  // shipping an article that fails most of the SEO score checks.
  if (focusKeyword && focusKeyword.trim().length > 0) {
    const placement = analyzeKeywordPlacement({
      keyword: focusKeyword,
      title: seoTitle,
      excerpt: seoExcerpt,
      ogDescription: seoOgDescription,
      body: seoBody,
    });

    if (placement.missingLocations.length > 0) {
      console.log(`[${articleId}] Focus keyword missing from: ${placement.missingLocations.join(', ')}. Running fix-up pass.`);
      try {
        const fixedUp = await fixUpMissingKeywordPlacements({
          keyword: focusKeyword,
          title: seoTitle,
          excerpt: seoExcerpt,
          ogDescription: seoOgDescription,
          body: seoBody,
          placement,
        });
        if (fixedUp.wasFixedUp) {
          seoTitle = fixedUp.title;
          seoExcerpt = fixedUp.excerpt;
          seoOgDescription = fixedUp.ogDescription;
          // Re-normalize the sign-off and re-strip paywalls in case the
          // fix-up touched the body
          seoBody = normalizeSignoff(fixedUp.body);
          seoBody = stripPaywalledLinks(seoBody).body;
          console.log(`[${articleId}] Keyword fix-up complete. Locations fixed: ${fixedUp.locationsFixed.join(', ')}`);
        }
      } catch (err) {
        console.error(`[${articleId}] Keyword fix-up failed, continuing with original draft:`, err);
      }
    } else {
      console.log(`[${articleId}] Focus keyword placement check: all 6 required locations present.`);
    }
  }

  const seoWordCount = seoBody.split(/\s+/).filter(Boolean).length;

  // Guardrail: if meta description is under 140 chars, extend it with a second focused pass.
  // Search snippets are ~160 chars; anything shorter than 140 wastes valuable real estate.
  if (seoOgDescription.length < 140) {
    console.log(`[${articleId}] Meta description too short (${seoOgDescription.length} chars). Extending...`);
    try {
      const { content: extendedMeta } = await mindstudio.generateText({
        message: `Rewrite this meta description to be between 140 and 160 characters (current: ${seoOgDescription.length}). Do not go under 140 or over 160. Include the focus keyword "${focusKeyword}" naturally. Plain, direct voice. No em dashes, no hype words, no filler.

## Article Title
${seoTitle}

## Current Meta Description (too short)
${seoOgDescription}

## Article Opening (for context)
${seoBody.split('\n').slice(0, 10).join('\n').substring(0, 600)}

Output ONLY the rewritten meta description. No preamble, no quotes around it. Count your characters carefully.`,
        modelOverride: {
          model: 'claude-4-6-sonnet',
          temperature: 0.3,
          maxResponseTokens: 500,
        },
      });
      const cleaned = extendedMeta.trim().replace(/^["']|["']$/g, '');
      if (cleaned.length >= 140 && cleaned.length <= 170) {
        seoOgDescription = cleaned;
        console.log(`[${articleId}] Meta description extended to ${cleaned.length} chars.`);
      }
    } catch (err) {
      console.error(`[${articleId}] Meta description extension failed:`, err);
      // Keep the original; not critical enough to block publishing
    }
  }

  // Save SEO-optimized draft
  await Articles.update(articleId, {
    title: seoTitle,
    body: seoBody,
    excerpt: seoExcerpt,
    ogDescription: seoOgDescription,
    tags: seoTags,
    focusKeyword,
    wordCount: seoWordCount,
  });

  console.log(`[${articleId}] SEO pass complete. Focus keyword: "${focusKeyword}". Generating hero image.`);

  // --- IMAGE PHASE ---
  // Hero image only. We previously generated 2 in-body break-point images for
  // visual rhythm, but Sondra correctly observed that decorative still-life
  // images placed mid-article don't add information value — they're just
  // pretty noise that reviewers flag and readers skim past. Inline images
  // need to EARN their place by carrying real information (data viz, pull
  // quotes, screenshots). Those are dedicated future features on the roadmap.
  // For now: hero only. Articles with great prose don't need more images.

  // No body-image break points needed — empty array. Kept the variable so
  // downstream code (insertBodyImages, reservedObjects) continues to work
  // with no changes; it just operates on an empty list.
  const breakPoints: { afterHeading: string; concept: ImageConcept }[] = [];
  const reservedObjects: string[] = [];

  // Query the last 6 articles that shipped with a hero image. Excludes this
  // article itself in case of retries.
  const recentArticles = await Articles
    .filter(a => a.heroImageObjects !== null && a.heroImageObjects !== undefined && a.id !== articleId)
    .sortBy(a => a.created_at)
    .reverse()
    .take(6);
  const recentCombinations = recentArticles
    .map(a => a.heroImageObjects)
    .filter((c): c is string[] => Array.isArray(c) && c.length > 0);

  let heroConcept: ImageConcept;
  try {
    heroConcept = await pickImageConcept({
      context: `Article title: ${seoTitle}
Focus keyword: ${focusKeyword}
Excerpt: ${seoExcerpt}
Article opening:
${seoBody.split('\n').slice(0, 15).join('\n').substring(0, 800)}

This is the HERO image for the article. It should represent the article's overall core idea, not one specific section. Pick objects whose combined meanings capture the whole argument.`,
      avoidObjects: reservedObjects,
      recentCombinations,
    });
  } catch (err) {
    console.error(`[${articleId}] Hero concept generation failed:`, err);
    heroConcept = {
      objects: [
        { name: 'Smooth ceramic sphere', meaning: 'The complete system this article describes.' },
        { name: 'Folded handmade paper', meaning: 'The thinking and iteration behind the idea.' },
        { name: 'Single brass key', meaning: 'The core insight the reader takes away.' },
      ],
      altText: `Editorial still life for ${seoTitle}`,
      composition: 'Objects arranged with generous negative space and thoughtful spacing.',
    };
  }

  console.log(`[${articleId}] Hero concept:`, heroConcept.objects.map(o => `${o.name}`).join(', '));

  // Step 3: In parallel, generate the hero image + body images AND run both
  // adversarial reviewers (SEO critique + Draft critique). LinkedIn posts
  // are DELIBERATELY NOT in this parallel phase — they run later so they
  // can be built from the post-auto-revise body, not the pre-revise draft.
  // Each call independently handles errors so one failure doesn't kill the
  // others.
  const [heroUrl, bodyUrl1, bodyUrl2, seoCritiqueResultInitial, draftCritiqueResultInitial] = await Promise.all([
    renderStillLife(heroConcept).catch(err => {
      console.error(`[${articleId}] Hero image render failed:`, err);
      return null;
    }),
    breakPoints[0]
      ? renderStillLife(breakPoints[0].concept).catch(err => {
          console.error(`[${articleId}] Body image 1 render failed:`, err);
          return null;
        })
      : Promise.resolve(null),
    breakPoints[1]
      ? renderStillLife(breakPoints[1].concept).catch(err => {
          console.error(`[${articleId}] Body image 2 render failed:`, err);
          return null;
        })
      : Promise.resolve(null),
    reviewSeoCritique({
      title: seoTitle,
      body: seoBody,
      excerpt: seoExcerpt,
      focusKeyword,
      metaDescription: seoOgDescription,
      competitorInsights: researchResult.output.competitorInsights,
    }).catch(err => {
      console.error(`[${articleId}] SEO critique failed:`, err);
      return null;
    }),
    reviewDraftCritique({
      title: seoTitle,
      body: seoBody,
      excerpt: seoExcerpt,
    }).catch(err => {
      console.error(`[${articleId}] Draft critique failed:`, err);
      return null;
    }),
  ]);
  const bodyUrls = [bodyUrl1, bodyUrl2].slice(0, breakPoints.length);

  // Step 3.5: AUTO-REVISE LOOP. If the critiques flagged any critical or
  // should-fix issues, run the reconciliation agent to apply the fixes
  // automatically. Then re-critique and loop — up to MAX_REVISION_ITERATIONS
  // times OR until there are no more actionable issues to address, whichever
  // comes first.
  //
  // Goal: Sondra opens the article and sees mostly-green critiques, spending
  // her editing time on voice judgment rather than mechanical compliance.
  //
  // Design decisions:
  // - Cap at 2 iterations. If 2 rounds can't clear the critiques, the
  //   remaining issues probably need human judgment — land the article
  //   in review with what we have.
  // - Break early if the critique comes back with no actionable issues —
  //   don't waste tokens running a second iteration on a clean article.
  // - Track skipped issues across iterations so the model doesn't burn
  //   tokens re-attempting fixes it already declined on voice grounds.
  // - Re-run BOTH critiques after each revision since an SEO fix can
  //   affect the Draft critique and vice versa.
  const MAX_REVISION_ITERATIONS = 2;
  let seoCritiqueResult = seoCritiqueResultInitial;
  let draftCritiqueResult = draftCritiqueResultInitial;
  const skippedIssuesAccumulated: Array<{ area: string; issue: string }> = [];
  let iterationsRun = 0;

  for (let i = 0; i < MAX_REVISION_ITERATIONS; i++) {
    const bundle = {
      seo: seoCritiqueResult || undefined,
      draft: draftCritiqueResult || undefined,
    };

    if (!hasActionableIssues(bundle)) {
      console.log(`[${articleId}] Auto-revise: no actionable issues remaining after ${i} iteration(s).`);
      break;
    }

    console.log(`[${articleId}] Auto-revise iteration ${i + 1}/${MAX_REVISION_ITERATIONS}: applying critique feedback...`);

    try {
      const revised = await applyCritiqueFeedback({
        title: seoTitle,
        excerpt: seoExcerpt,
        body: seoBody,
        ogDescription: seoOgDescription,
        focusKeyword,
        critiques: bundle,
        alreadySkipped: skippedIssuesAccumulated,
      });

      // If the reconciliation agent chose not to change anything, there's
      // no point running another critique pass — we'll get the same result.
      if (!revised.anyChanges) {
        console.log(`[${articleId}] Auto-revise iteration ${i + 1}: reconciliation declined all remaining issues (voice lock). Stopping loop.`);
        // Capture the skip reasons for the final state
        for (const s of revised.skippedIssues) {
          skippedIssuesAccumulated.push({ area: s.area, issue: s.issue });
        }
        break;
      }

      // Apply the revised content
      seoTitle = revised.title;
      seoExcerpt = revised.excerpt;
      seoBody = revised.body;
      seoOgDescription = revised.ogDescription;
      iterationsRun = i + 1;

      // Accumulate the skipped issues so the next iteration knows not to
      // re-attempt them
      for (const s of revised.skippedIssues) {
        skippedIssuesAccumulated.push({ area: s.area, issue: s.issue });
      }

      // Re-normalize the sign-off and strip any paywalls the reconciliation
      // accidentally let through (belt-and-suspenders)
      seoBody = normalizeSignoff(seoBody);
      seoBody = stripPaywalledLinks(seoBody).body;

      // Re-critique the revised article for the next iteration's decision
      const [newSeo, newDraft] = await Promise.all([
        reviewSeoCritique({
          title: seoTitle,
          body: seoBody,
          excerpt: seoExcerpt,
          focusKeyword,
          metaDescription: seoOgDescription,
          competitorInsights: researchResult.output.competitorInsights,
        }).catch(err => {
          console.error(`[${articleId}] Auto-revise SEO re-critique failed:`, err);
          return seoCritiqueResult;  // fall back to prior critique
        }),
        reviewDraftCritique({
          title: seoTitle,
          body: seoBody,
          excerpt: seoExcerpt,
        }).catch(err => {
          console.error(`[${articleId}] Auto-revise Draft re-critique failed:`, err);
          return draftCritiqueResult;
        }),
      ]);

      seoCritiqueResult = newSeo;
      draftCritiqueResult = newDraft;

      console.log(`[${articleId}] Auto-revise iteration ${i + 1} complete. SEO issues: ${newSeo?.issues.length || 0}, Draft issues: ${newDraft?.issues.length || 0}`);
    } catch (err) {
      console.error(`[${articleId}] Auto-revise iteration ${i + 1} failed, stopping loop:`, err);
      break;
    }
  }

  if (iterationsRun > 0) {
    console.log(`[${articleId}] Auto-revise complete: ${iterationsRun} iteration(s) ran, ${skippedIssuesAccumulated.length} issues explicitly preserved for voice.`);
  }

  // Step 3.6: Generate LinkedIn posts NOW, from the final revised body.
  // Moved after the auto-revise loop so the LinkedIn variants reflect the
  // article that ships to the reader, not the pre-revise draft.
  let linkedInPostsResult: any[] = [];
  try {
    linkedInPostsResult = await generateAllLinkedInPosts({
      articleTitle: seoTitle,
      articleBody: seoBody,
      articleExcerpt: seoExcerpt,
      focusKeyword,
    });
  } catch (err) {
    console.error(`[${articleId}] LinkedIn post generation failed:`, err);
    linkedInPostsResult = [];
  }

  // Step 4: Insert body images into the article markdown. We walk the body line
  // by line, and when we find a line that matches one of our target headings,
  // we insert the image markdown after that section's opening paragraph.
  let finalBody = seoBody;
  const successfulBodyImages = breakPoints
    .map((bp, i) => ({ ...bp, url: bodyUrls[i] }))
    .filter((bp): bp is typeof bp & { url: string } => bp.url !== null);

  if (successfulBodyImages.length > 0) {
    finalBody = insertBodyImages(seoBody, successfulBodyImages);
  }

  // Step 5: Save everything in one update. If hero image failed we keep the
  // article as-is (no imageUrl); the user can regenerate from the editor.
  //
  // CRITICAL: include the title, excerpt, ogDescription, metaDescription,
  // and wordCount here. The auto-revise loop can mutate any of these, and
  // the earlier "Save SEO-optimized draft" at line ~489 only captured the
  // pre-revise state. If we don't resave them here, the DB keeps the
  // old title/excerpt/etc. but the body has been revised — and the saved
  // critiques reference the revised article against the stale metadata,
  // which surfaces as "the critique keeps flagging the old title."
  const finalWordCount = finalBody.split(/\s+/).filter(Boolean).length;
  const updates: any = {
    title: seoTitle,
    body: finalBody,
    excerpt: seoExcerpt,
    ogDescription: seoOgDescription,
    metaDescription: seoOgDescription,
    wordCount: finalWordCount,
  };
  if (heroUrl) {
    updates.imageUrl = heroUrl;
    updates.coverImageAlt = heroConcept.altText;
    // Save the chosen objects so future articles can avoid repeating them
    updates.heroImageObjects = heroConcept.objects.map(o => o.name);
  }
  // Restamp generatedAt at save time so the UI's freshness check compares
  // against when the critique was saved — not when it was generated in a
  // parallel batch that may have finished tens of seconds before the save.
  const critiqueSaveTimestamp = Date.now();
  if (seoCritiqueResult) {
    updates.seoCritique = { ...seoCritiqueResult, generatedAt: critiqueSaveTimestamp };
    console.log(`[${articleId}] SEO critique: ${seoCritiqueResult.issues.length} issues (${seoCritiqueResult.issues.filter(i => i.severity === 'critical').length} critical)`);
  }
  if (draftCritiqueResult) {
    updates.draftCritique = { ...draftCritiqueResult, generatedAt: critiqueSaveTimestamp };
    console.log(`[${articleId}] Draft critique: ${draftCritiqueResult.issues.length} issues (${draftCritiqueResult.issues.filter(i => i.severity === 'critical').length} critical)`);
  }
  if (linkedInPostsResult && linkedInPostsResult.length > 0) {
    updates.linkedInPosts = linkedInPostsResult;
    console.log(`[${articleId}] LinkedIn posts: ${linkedInPostsResult.length} variants generated (${linkedInPostsResult.map(p => p.postType).join(', ')})`);
  }
  await Articles.update(articleId, updates);
  console.log(`[${articleId}] Images complete. Hero: ${heroUrl ? 'yes' : 'failed'}. Body images: ${successfulBodyImages.length}/${breakPoints.length}`);

  // Move to review
  await Articles.update(articleId, { status: 'review' });
  console.log(`[${articleId}] Article ready for review.`);
}

// Pick 2 natural break points in the article body where an in-body image would
// add value. Returns the heading to insert after plus the image concept for each.
async function pickBodyImageBreakPoints(opts: {
  articleId: string;
  title: string;
  body: string;
  focusKeyword: string;
}): Promise<{ afterHeading: string; concept: ImageConcept }[]> {
  // Extract all H2 headings from the body so the AI has a clear list to choose from.
  const h2Headings = (opts.body.match(/^##\s+.+$/gm) || []).map(h => h.replace(/^##\s+/, '').trim());

  // Articles with fewer than 3 sections don't benefit from in-body images.
  if (h2Headings.length < 3) {
    console.log(`[${opts.articleId}] Only ${h2Headings.length} H2 headings, skipping body images.`);
    return [];
  }

  interface BreakPointPlan {
    images: {
      afterHeading: string;
      sectionArgument: string;
      concept: ImageConcept;
    }[];
  }

  const exampleBreakPoints: BreakPointPlan = {
    images: [
      {
        afterHeading: 'The Cost Nobody Quotes: Data Preparation',
        sectionArgument: 'The hidden engineering cost of preparing training data, which most articles ignore.',
        concept: {
          objects: [
            { name: 'Folded handmade paper', meaning: 'The thousand instruction-response pairs someone has to write.' },
            { name: 'Dried botanical stems', meaning: 'Time spent growing a dataset manually, slow and organic.' },
            { name: 'Small brass geometric shapes', meaning: 'The structured engineering hours behind each pair.' },
          ],
          altText: 'Folded handmade paper, dried botanical stems, and small brass geometric shapes on linen.',
          composition: 'The paper fans out on the left, stems extend diagonally, brass shapes cluster in front.',
        },
      },
      {
        afterHeading: 'The Vendor Lock-In Problem With Fine-Tuning',
        sectionArgument: 'The risk of being tied to one model provider when you fine-tune.',
        concept: {
          objects: [
            { name: 'Single brass key', meaning: 'The one model provider you are locked into.' },
            { name: 'Frosted glass cube', meaning: 'The fine-tuned weights trapped inside that system.' },
            { name: 'Coiled linen rope', meaning: 'The dependency chain back to the provider.' },
          ],
          altText: 'A brass key, frosted glass cube, and coiled linen rope arranged on warm linen.',
          composition: 'The key rests on top of the cube, with the rope coiling around them both.',
        },
      },
    ],
  };

  try {
    const { content } = await mindstudio.generateText({
      message: `Article title: ${opts.title}
Focus keyword: ${opts.focusKeyword}

Article H2 headings:
${h2Headings.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Full article body:
${opts.body.substring(0, 6000)}

Pick the 2 best H2 headings in this article after which to place an in-body still life image. Pick spots that break up long stretches of text and represent a meaningful argument or turn in the piece. Avoid the first H2 (the hero image already covers the opening) and the last H2 (the conclusion doesn't need a visual break). For each image, describe the specific argument being made in that section and choose objects from the bank that represent that section's argument (not the whole article).`,
      modelOverride: {
        model: 'claude-4-6-sonnet',
        temperature: 0.5,
        maxResponseTokens: 16000,
        preamble: `You are the art director for SystemStudio's Journal. Choose break points in an article where in-body still life images add visual rhythm, and pick objects from the brand's curated bank for each.

CRITICAL: Choose ONLY from this exact object bank. Do not invent new objects.

## Object Bank

- Smooth ceramic sphere (deep teal): completeness, self-contained systems
- Stacked flat river stones (teal and sage): layering, foundations, building up
- Frosted glass cube (pale blue): transparency, containment, data, precision
- Glass vessel with pale liquid (pale blue): containment, proprietary data, reservoirs
- Folded handmade paper (blush pink): drafts, documents, iterating
- Coiled linen rope or thread (natural linen): connection, sequence, pipelines
- Dried botanical stems (sage green): growth, organic processes
- Small brass geometric shapes: precision, engineering, structure
- Smooth wooden blocks (sage stone): building blocks, modularity
- Single brass key: access, unlocking, proprietary

## Rules

- Choose exactly 2 break points.
- afterHeading must match one of the provided H2 headings EXACTLY as written.
- Don't pick the first H2 (too close to the hero image) or the last H2 (conclusion).
- The two images should use DIFFERENT object combinations from each other, so they feel distinct.
- Each concept's objects and meanings must connect to that specific section's argument.
- 3-4 objects per image.
- altText under 140 chars.
- No text, screens, devices, hands, or people.
- Plain, direct voice. No em dashes, no hype.`,
      },
      structuredOutputType: 'json',
      structuredOutputExample: JSON.stringify(exampleBreakPoints),
    });

    const plan: BreakPointPlan = JSON.parse(content);

    // Validate that the returned headings actually exist in the article.
    // The AI sometimes paraphrases, so match case-insensitively and fall back
    // to fuzzy matching if needed.
    const result = plan.images
      .map(img => {
        const matched = h2Headings.find(h =>
          h.toLowerCase() === img.afterHeading.toLowerCase() ||
          h.toLowerCase().includes(img.afterHeading.toLowerCase()) ||
          img.afterHeading.toLowerCase().includes(h.toLowerCase())
        );
        return matched ? { afterHeading: matched, concept: img.concept } : null;
      })
      .filter((x): x is { afterHeading: string; concept: ImageConcept } => x !== null);

    console.log(`[${opts.articleId}] Body image break points:`,
      result.map(r => `"${r.afterHeading}" → ${r.concept.objects.map(o => o.name).join(', ')}`).join(' | ')
    );

    return result;
  } catch (err) {
    console.error(`[${opts.articleId}] Break point selection failed:`, err);
    return [];
  }
}

// Insert markdown image tags into the body after each specified heading's section.
// We insert AFTER the first paragraph following the heading so the heading and
// its opening thought stay together, and the image breaks into the middle of
// the section rather than displacing the heading.
function insertBodyImages(
  body: string,
  images: { afterHeading: string; concept: ImageConcept; url: string }[]
): string {
  const lines = body.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    result.push(line);

    // Check if this line is one of our target headings
    const match = /^##\s+(.+)$/.exec(line.trim());
    if (match) {
      const headingText = match[1].trim();
      const targetImage = images.find(img => img.afterHeading === headingText);

      if (targetImage) {
        // Advance past the heading and the first paragraph, then insert the image.
        // A paragraph ends at the next blank line or the next heading.
        i++;
        // Skip any blank lines right after the heading
        while (i < lines.length && lines[i].trim() === '') {
          result.push(lines[i]);
          i++;
        }
        // Copy the first paragraph (until blank line or next heading)
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].trim().startsWith('#')) {
          result.push(lines[i]);
          i++;
        }
        // Insert the image with a blank line on each side for clean markdown
        result.push('');
        result.push(`![${targetImage.concept.altText}](${targetImage.url})`);
        result.push('');
        continue;
      }
    }
    i++;
  }

  return result.join('\n');
}
