---
name: Canonical Blog
description: A fully-owned, public-facing blog on this platform — beautiful, fast, and in Sondra's brand — so publishing never depends on systemstudio.ai's API being ready or available.
effort: large
status: planned
---

The pipeline currently depends on systemstudio.ai's API to get articles live. That's fine as a starting point, but it creates a dependency Sondra doesn't need. This makes the pipeline fully self-sufficient: a public blog lives on this platform, and publishing means the article is live on the internet, right now, no API required. The systemstudio.ai integration becomes optional, not critical.

## What it looks like

**Public Blog**
- A public-facing blog at a route like `/blog` (or a custom domain configured in settings)
- Article listing page: clean, editorial layout with hero images, titles, subtitles, and publish dates
- Individual article pages: the same reading quality as the internal editor, designed for public consumption
- Fast, static-feeling, beautiful — a real destination, not a CMS export

**Article Design**
- Full-bleed hero image at the top of each article (Editorial Still Life style, consistent with the pipeline's generated images)
- Generous typography: Bespoke Serif for headlines, Satoshi for body — the same design language as the internal tool, turned public
- Reading time, publish date, and a sticky reading progress indicator
- "Share" actions: copy link, share to LinkedIn, share to X
- Related articles at the bottom (based on semantic similarity)

**Subscribe Integration**
- Inline subscribe prompt at the end of every article: "Get new articles in your inbox"
- Connected to the Built-In Newsletter subscriber list
- No pop-ups. The subscribe prompt lives at the end of the content where readers who finished the article are most likely to convert.

**Publishing Flow Change**
- "Publish" now offers two options (or both simultaneously): "Publish to Blog" (this platform) and "Send to systemstudio.ai" (the external API)
- Sondra can use one or both. The pipeline is no longer blocked on external API availability.
- Published articles on the blog get a public URL stored on the article record

**SEO Optimization**
- Each published page gets proper OG tags, Twitter cards, structured data (JSON-LD Article schema)
- Sitemap automatically generated and updated on each publish
- Hero image served as OG image at 1200x630

## Key details

- The blog is read-only for the public — no comments, no accounts, no interaction surface
- Custom domain support (via CNAME configuration) so it can live at `blog.systemstudio.ai` or a custom domain
- The blog inherits the article's SEO metadata: title, meta description, keywords generated in the pipeline
- Unpublishing is immediate: the article disappears from the public listing but remains in the pipeline

~~~
The public blog is a set of unauthenticated routes in the web interface:
- `/blog` — article listing (fetches published articles via a public `getPublishedArticles()` method)
- `/blog/:slug` — individual article (fetches via `getPublishedArticle(slug)` method)

The `slug` is auto-generated from the article title at publish time, stored on the article record. The article record gets a `publishedOnBlog` boolean and a `blogSlug` field.

`getPublishedArticles()` and `getPublishedArticle(slug)` are public methods (no auth required). They only return articles with `publishedOnBlog: true`.

The publish action gains a `publishToBlog` option. When true: sets `publishedOnBlog: true`, generates slug, optionally also sends to systemstudio.ai API.

For custom domain support: that's a platform-level concern (custom domain mapping in the app config). Flag as future configuration.
~~~
