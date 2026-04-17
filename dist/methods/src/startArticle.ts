import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { Topics } from './tables/topics';
import { VOICE_PROFILE, AUDIENCE_PROFILE, RESEARCH_SOURCES } from './common/voiceProfile';
import { pickImageConcept, renderStillLife, ImageConcept } from './common/generateStillLife';
import { reviewSeoCritique } from './common/seoCritique';
import { reviewDraftCritique } from './common/draftCritique';
import { generateAllLinkedInPosts } from './common/linkedInPosts';

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

${topicKeyword ? `## SEO Target\nPrimary focus keyword: "${topicKeyword}". Include this naturally in the title, first paragraph, and 2-3 more times in the body. Do not force it.` : ''}

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

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
- End with --- followed by suggested tags from: strategy, ai-adoption, operations, case-study, tools, leadership, methodology
- And an ogDescription (max 160 chars)
- **Link to sources naturally.** When referencing specific data, quotes, surveys, or claims from the research, link to the source inline using markdown link syntax: \`[like this](https://example.com/source)\`. Aim for 2-5 outbound links across the article. The research brief above contains the URLs. These links build credibility and SEO authority. Do not pile links in a "sources" section at the end. Weave them into the prose where the fact or quote appears.

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

## Your Tasks

1. **Optimize the title for search.** Keep it compelling and human, but make sure it includes a clear primary keyword phrase that someone would actually search for. Don't stuff keywords. The title should still sound like something a smart person would click on.

2. **Improve heading structure.** Make sure ## headings use natural keyword variations. Each section should target a subtopic someone might search for. Don't force keywords where they don't belong.

3. **Add a focus keyword phrase.** Identify the single best keyword phrase (2-4 words) this article should rank for. This should be what a non-technical founder would actually type into Google.

4. **Optimize the excerpt** for search snippets. Keep it to 1-2 sentences, include the focus keyword naturally.

5. **Write the OG description between 140 and 160 characters.** This is critical. Shorter than 140 wastes search snippet real estate; longer than 160 gets truncated. Count carefully. Include the focus keyword naturally. Make it compelling enough that someone scrolling search results wants to click.

6. **Review the body.** Make sure the focus keyword appears naturally in the first paragraph and at least 2-3 more times throughout, without forcing it. Add internal context or clarifying sentences if they help the article rank for related queries. Do NOT add fluff, filler paragraphs, or unnatural keyword repetitions.

7. **Suggest tags** from this list that genuinely fit: strategy, ai-adoption, operations, case-study, tools, leadership, methodology, roi, automation, data, implementation

## Rules
- Do not change Sondra's voice or tone. She writes in plain, direct language.
- Do not add em dashes, emojis, or hype language.
- Do not add "In this article, we'll explore..." or similar SEO filler.
- Do not make the article longer just for SEO. Every sentence should earn its place.
- Keep paragraphs short (2-4 sentences).

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

  console.log(`[${articleId}] SEO pass complete. Focus keyword: "${focusKeyword}". Generating images.`);

  // --- IMAGE PHASE ---
  // Generate one hero image for the article plus two in-body images placed at
  // natural break points. Total of 3 images per article hits the industry
  // minimum for a standard blog post and creates visual rhythm throughout.

  // Step 1: Pick break points for in-body images. Let the AI analyze the article
  // and identify 2 natural spots where a visual would add value. Returns the
  // ## heading to insert each image after, plus the concept for that image.
  const breakPoints = await pickBodyImageBreakPoints({
    articleId,
    title: seoTitle,
    body: seoBody,
    focusKeyword,
  });

  // Step 2: Pick a hero concept (whole-article metaphor). Avoid objects already
  // reserved for body images so the three images feel distinct within this
  // article, AND avoid combinations used in recent articles so the blog has
  // visual variety across posts.
  const reservedObjects = breakPoints.flatMap(bp => bp.concept.objects.map(o => o.name));

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

  // Step 3: In parallel, generate all three images, run BOTH adversarial
  // reviewers (SEO critique + Draft critique), AND generate the LinkedIn
  // post variants. Images, critiques, and LinkedIn posts are independent so
  // running concurrently saves significant time on the critical path. Each
  // call independently handles errors so one failure doesn't kill the others.
  const [heroUrl, bodyUrl1, bodyUrl2, seoCritiqueResult, draftCritiqueResult, linkedInPostsResult] = await Promise.all([
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
    generateAllLinkedInPosts({
      articleTitle: seoTitle,
      articleBody: seoBody,
      articleExcerpt: seoExcerpt,
      focusKeyword,
    }).catch(err => {
      console.error(`[${articleId}] LinkedIn post generation failed:`, err);
      return [];
    }),
  ]);
  const bodyUrls = [bodyUrl1, bodyUrl2].slice(0, breakPoints.length);

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
  const updates: any = { body: finalBody };
  if (heroUrl) {
    updates.imageUrl = heroUrl;
    updates.coverImageAlt = heroConcept.altText;
    // Save the chosen objects so future articles can avoid repeating them
    updates.heroImageObjects = heroConcept.objects.map(o => o.name);
  }
  if (seoCritiqueResult) {
    updates.seoCritique = seoCritiqueResult;
    console.log(`[${articleId}] SEO critique: ${seoCritiqueResult.issues.length} issues (${seoCritiqueResult.issues.filter(i => i.severity === 'critical').length} critical)`);
  }
  if (draftCritiqueResult) {
    updates.draftCritique = draftCritiqueResult;
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
