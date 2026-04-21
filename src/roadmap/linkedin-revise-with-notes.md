---
name: Revise LinkedIn Posts with Notes
description: Give the AI targeted revision instructions for any LinkedIn post variant — tighten, reframe, shift the CTA — without triggering a full rewrite that throws out what was working.
effort: small
status: planned
---

There's a gap between manual editing and full regeneration. Manual editing means Sondra does all the thinking herself. Full regen throws out everything and starts over. Neither is right when the post is mostly there but one section needs to land differently. This feature closes that gap: Sondra tells the AI exactly what to change, and the AI changes only that.

## What it looks like

**Revise with Notes button**
- Sits next to Edit and Regen on each LinkedIn post variant
- Opens an inline form with a single textarea: "What should change?"
- Examples of what Sondra might type:
  - "Tighten this by 20%"
  - "Change the CTA to an open-ended question"
  - "Rewrite the opening to lead with the pricing stat"
  - "Make the middle section more personal"
- "Revise" button submits. The revised post replaces the current variant text in place.
- The variant is marked as edited. The post type and ID are preserved.

**What the AI preserves**
- The post type (story stays a story, stat-led stays stat-led)
- The audience framing — non-technical founders, no jargon
- Sondra's voice
- Everything not mentioned in the revision notes

**What the AI changes**
- Only what the notes explicitly address
- If the notes are ambiguous, the AI errs toward minimal intervention

## Key details

- This is revision, not regeneration. The AI receives the full current post text alongside the notes and is explicitly instructed to treat unmentioned sections as locked.
- Regen remains available if Sondra wants a full fresh take — these are two distinct actions with different expectations.
- There is no revision history — if Sondra dislikes the result, Regen is the escape hatch.
- Notes field has no minimum length. "Less formal" is a valid instruction.

~~~
New `reviseLinkedInPost(postId, currentText, revisionNotes, postType)` backend method.

Prompt structure:
- System: Sondra's voice profile + LinkedIn format constraints + post type context
- User: "Here is the current post: [currentText]. Revision instructions: [revisionNotes]. Revise only what the instructions address. Preserve everything else — the post type, audience framing, voice, and any sections not mentioned."

Returns revised post text. Frontend updates the variant in place, sets `edited: true` on the variant record.

UI pattern mirrors the existing Direct AI button on image variants: button opens an inline form anchored below the post card, submits inline, result replaces the textarea content without page navigation.
~~~
