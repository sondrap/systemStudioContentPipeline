# Scan Topics

Runs a full scan of the web for trending developments in AI agents, RAG, and agentic workflows. Produces 3-5 topic suggestions and adds them directly to the backlog.

## When to use

- When Sondra says "scan for topics," "find me something to write about," "what's trending," or similar
- When she asks for fresh topic ideas and wants the pipeline to go research what's happening
- NOT for brainstorming in conversation (just discuss topics directly) — this tool actually searches the web and creates backlog entries

## What it does

The scan takes 30-60 seconds. It searches Google for recent developments, scrapes relevant sources, checks what's already in the backlog to avoid duplicates, and adds new suggestions with reasoning and source links.

## After calling

Tell Sondra how many topics were found and give a brief summary of each one. She can review them in the Backlog tab. Ask if any catch her eye or if she wants to start research on one.

## Parameters

Takes no input — it scans based on the configured source ecosystem automatically.

## Returns

`topics` — array of newly created topic records
`count` — number of topics added
