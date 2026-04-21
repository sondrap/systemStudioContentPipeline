---
name: LinkedIn Post Critique
description: An adversarial reviewer built specifically for LinkedIn — scoring each post variant on hook strength, CTA fit, line-break rhythm, voice fidelity, and algorithm-safe phrasing before it ever gets posted.
effort: medium
status: planned
---

The pipeline already puts article drafts through a critique pass before they ship. LinkedIn posts deserve the same treatment — but the quality dimensions are completely different. A post that would make a great article paragraph can be invisible on LinkedIn if the hook doesn't land in the first two lines. This is a purpose-built reviewer that knows the difference.

## What it looks like

A **Review** button appears on each PostVariantCard and in the expanded Expand modal. The user clicks it on demand — it doesn't run automatically on every generation.

The critique returns a structured panel — same critical / should-fix / nice-to-have severity scheme as article critiques — covering six dimensions specific to LinkedIn:

- **Hook freshness** — Do the first two lines stop the scroll before the "see more" fold? Is the hook specific, or is it a generic opener that disappears into the feed?
- **CTA appropriateness** — Does the call to action match the post type and avoid the engagement-bait phrases the LinkedIn algorithm actively suppresses?
- **Line-break rhythm** — Are paragraph breaks used correctly? No walls of text. No single-word line breaks used as a cheap trick.
- **Voice consistency** — Does it sound like Sondra, or does it sound like a LinkedIn ghostwriter? Flags tonal drift from her established voice profile.
- **Audience fit** — Would a non-technical founder resonate with this, or is it written for AI practitioners? Surfaces when the post drifted toward the wrong ICP.
- **Algorithm-safe phrasing** — Flags specific words and phrases from the LinkedIn research that are known to reduce reach.

Each finding has a severity label and a one-sentence explanation. No prescriptive rewrites in the critique itself — the natural next step is Revise with Notes, where Sondra gives a targeted instruction and the AI handles the fix.

## Key details

- Runs on demand only. Automatic critique on every generation would be expensive and noisy — the user asks for a review when they're considering using a variant.
- The critique prompt is built from `src/references/linkedin-posts-research.md` — the same research doc that drives the generator. The reviewer knows the rules because it learned from the same source.
- Voice consistency scoring uses Sondra's voice profile from `src/voice-profile.md` as the reference benchmark.
- Critique results are ephemeral per-session — they don't persist to the database. Re-running after a Revise with Notes rewrite gives fresh results.
- The critique does not rewrite. It flags. Sondra decides what to fix and how.
- The Revise with Notes workflow is the intended next step: read the critique, copy the finding that matters, paste it as a revision note, get a targeted rewrite.

~~~
New `reviewLinkedInPost` backend method. Shared `common/linkedInPostCritique.ts` helper that structures the prompt from the LinkedIn research doc and voice profile. `LinkedInPostCritiquePanel` component renders the structured output — collapsible per-dimension, severity badge per finding. The Review button in PostVariantCard triggers the method with the current post body. Results rendered inline below the post text.
~~~
