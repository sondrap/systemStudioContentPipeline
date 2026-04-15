---
name: LinkedIn Cross-Post
description: After an article publishes to the blog, generate a condensed, LinkedIn-native version and post it to Sondra's profile in one click.
effort: small
status: planned
---

Publishing to the blog is the first step. LinkedIn is where the audience actually is. This connects the two: after an article goes live, the pipeline generates a LinkedIn-native post in Sondra's voice and surfaces it for one-click posting. No copy-paste, no reformatting.

## What it looks like

**Post-Publish Prompt**
- After an article successfully publishes, a prompt appears: "Post to LinkedIn?"
- Shows a preview of the generated LinkedIn post — condensed version of the article's key point, written in LinkedIn's native style (shorter paragraphs, direct hook, call to action)
- Sondra can edit the post inline before posting
- "Post Now" or "Save as Draft" (saves to LinkedIn drafts)

**LinkedIn Post Format**
- Opens with a hook — the single most provocative or interesting point from the article
- 3-5 short paragraphs (LinkedIn punishes long blocks)
- Ends with a question or a direct CTA linking to the full article
- Maintains Sondra's voice: specific, direct, no filler, no hashtag spam
- 1,300 characters or less (LinkedIn sweet spot for feed reach)

**Post History**
- The article record tracks whether a LinkedIn post was generated and sent
- Published LinkedIn posts show in the article metadata panel with a link

## Key details

- LinkedIn posting requires OAuth connection (one-time setup in Settings)
- The generated post is always a starting point, never auto-posted without review
- If Sondra edits the post, the edits don't affect the original article
- The LinkedIn post is generated at the time of publish, using the final approved article content

~~~
LinkedIn integration uses the LinkedIn API (share endpoint). Requires:
- OAuth 2.0 flow in Settings to connect Sondra's LinkedIn account
- Store `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_USER_ID` as secrets (with refresh token handling)
- `generateLinkedInPost(articleId)` method: calls `generateText` with the article body + LinkedIn format instructions from the voice profile, returns the draft post
- `publishToLinkedIn(articleId, postText)` method: POSTs to LinkedIn shares API

The post-publish prompt is a modal/panel that appears after the success state animation on the Approve & Publish flow. If Sondra dismisses it, it's accessible again from the article's metadata panel via a "Post to LinkedIn" button.
~~~
