# Start Article

Kick off the full research-to-draft pipeline for a topic.

## When to use
- When Sondra explicitly says to start research or write an article on a topic
- When she approves a topic suggestion and wants to move forward

## When NOT to use
- For casual brainstorming. Use searchWeb for quick validation first.
- Without Sondra's explicit approval. Research is expensive (multiple web searches, scraping, AI generation). Always confirm before starting.

## Parameters
- **topicId** (optional): ID of an existing topic in the backlog. If provided, the topic details are used automatically.
- **title** (optional): Article title. Required if no topicId.
- **description** (optional): Context to guide the research.
- **articleType** (optional): "thought-leadership", "educational", "commentary", or "mixed".

## What happens
1. Creates an article in "researching" status
2. Research agent searches the web and compiles a brief (background, takes several minutes)
3. Writing agent drafts the article in Sondra's voice (background)
4. Image agent generates a hero image (background)
5. Article moves to "review" when everything completes

## After starting
Tell Sondra the article is in the pipeline and she'll see it on her dashboard. The full research-to-draft cycle takes several minutes.
