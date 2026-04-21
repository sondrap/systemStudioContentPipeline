---
name: YouTube Channel Signals
description: The research agent subscribes to the RSS feeds of the AI practitioner channels already in the source list — so when Cole Medin or AI Jason drops something, the pipeline knows immediately.
effort: small
status: planned
---

These YouTube channels are already listed as trusted signal sources, but the pipeline can't actually watch them — so right now they function as a reference list more than a live feed. That changes with RSS. YouTube exposes a per-channel RSS feed that returns recent uploads with title, description, and publish date. No scraping, no search guessing. The pipeline subscribes to each channel and surfaces what dropped since the last scan.

## What it looks like

During each scan cycle, the pipeline checks the RSS feed for each subscribed channel before doing anything else. Any video published since the last scan becomes a signal candidate — appearing in the Morning Intelligence Brief alongside newsletter items and GitHub activity, labeled by channel.

A signal entry from this source might look like: "Cole Medin — posted 2 days ago: 'Why most agent frameworks fail in production' (40 min)." That's enough for the intersection filter to ask whether non-technical founders are experiencing the failure modes being described, and flag it if they are.

For videos the agent judges as directly relevant to a high-priority topic in-flight, it can optionally pull a transcript and surface key excerpts — treated as research supporting evidence, not as content to summarize or republish.

## Key details

- Channels covered at launch: Cole Medin, David Shapiro, AI Jason, aiwithbrandon, Alejandro AO, Sam Witteveen — all already listed in `src/sources.md`
- RSS provides: video title, description snippet, publish date, video URL. This alone is sufficient for topic signal purposes.
- Full transcription is opt-in and selective — only when the video title and description suggest direct relevance to an active topic or in-flight research brief. Transcription is higher-cost and should not run on every upload.
- Deduplication applies: a video that surfaces in one brief won't re-surface in the next unless it's linked to a new audience-side signal
- New channels can be added by updating `src/sources.md` — no code change required, the subscriber list is driven by the sources spec
- These are practitioner-world signals, not ICP signals. The intersection filter still applies: a video only makes it into the brief if it maps to a pain theme Sondra's audience is actively expressing

~~~
YouTube RSS feed URL pattern: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID

Requires a one-time lookup to resolve channel handles (Cole Medin, etc.) to their channel IDs. Store channel ID alongside channel name in the sources config or a `youtube_channels` table: `channelId`, `channelHandle`, `displayName`, `lastChecked`.

During the cron scan, fetch each channel's RSS feed (standard HTTP GET, no auth required). Parse the Atom XML for `<entry>` items — each has `<title>`, `<published>`, `<summary>`, and `<link>`. Filter to entries published after `lastChecked`. Pass titles + descriptions through the same intersection filter used for newsletter items.

For selective transcription: if a topic in the backlog or active pipeline has a `signalUrl` pointing to a YouTube video, the research agent's `researchTopic` method can optionally call `transcribeAudio` from the MindStudio SDK on the video URL. Gate this behind an explicit agent decision (not automatic) to control cost.
~~~
