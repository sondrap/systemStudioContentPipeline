---
name: Tone Tagging Per Variant
description: A tone axis on every LinkedIn post variant — so regenerating a story post as "brutally honest" vs "teacher mode" gives two genuinely different renderings of the same angle, without typing guidance each time.
effort: small
status: planned
---

The pipeline already generates five post types, each with its own implicit register. But within a post type, every regen produces variations of the same voice. Tone Tagging adds an explicit second axis — so "story post, brutally honest" and "story post, teacher mode" are meaningfully different outputs, not just reworded versions of each other.

## What it looks like

Each PostVariantCard gets a small Tone dropdown alongside the existing controls. It defaults to **Auto** — the system picks the most natural tone for the post type. The user can override it at any time.

**Starting tone set:**
- **Auto** — system picks based on post type (default)
- **Brutally honest** — direct, no sugar, confrontational where needed
- **Teacher mode** — patient, explanatory, confident, structured
- **Storyteller** — narrative-driven, scene-setting, emotional beats
- **Contrarian** — challenges conventional wisdom, spine-stiffened
- **Casually expert** — warm, conversational, earned authority

Once a tone is selected and the user hits Regen, the chosen tone passes into the generator as an additional constraint on top of the post type. The selection persists per-variant — it sticks across regens until the user changes it.

## Key details

- Tone is a per-variant setting, not a global setting. Two variants of the same post type can have different tones simultaneously.
- Auto behavior: story → Storyteller, hot-take → Contrarian, framework → Teacher mode, data → Casually expert, confession → Brutally honest. These are defaults, not locks.
- Direct AI (free-text guidance) still works alongside tone — tone is the quick path, Direct AI is the override for anything more specific.
- Tone label appears in the PostVariantCard header so the user always knows what they're looking at without opening the dropdown.
- The tone set is hardcoded at launch — adding new tones is a prompt update, not a UI rebuild.

~~~
Small dropdown added to PostVariantCard. Tone value stored in the variant's local state (and persisted to the database alongside the variant). When Regen fires, tone is passed as an additional system instruction in the LinkedIn post generation prompt. The generator prompt already has the post type framing; tone becomes a second constraint layer appended after it. No new backend method needed — extend the existing generateLinkedInPost method to accept an optional tone parameter.
~~~
