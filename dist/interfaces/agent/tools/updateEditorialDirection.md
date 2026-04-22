# Update Editorial Direction

Set or revise Sondra's editorial direction, a short living note that steers the topic scanner and frames what kind of articles she wants right now.

## When to use

Sondra doesn't have a settings page for this. It lives entirely in your conversation with her. Watch for signals in how she talks, and use this tool when she:

- Comments on the **tone** of recent articles ("these feel too negative", "keep it encouraging", "less doom and gloom")
- Says what she's **focused on** right now ("I want to write more about practical tools", "the next few should be about automation for solopreneurs")
- Says what she's **tired of** ("enough chatbot topics for a while", "I don't want another cost/pricing piece")
- Mentions a **seasonal or campaign focus** ("holiday-appropriate stuff", "everything should tie back to the book launch")
- Gives direction that should **apply to future articles, not just one**

Do NOT use this for one-article feedback. If she's critiquing a specific piece, that's a Send Back note on that article, not editorial direction.

## How to use it well

1. **Read the current direction first.** Call `getDashboardData` (slim: true) to see what's currently set in `editorialDirection`. Build on it, don't wipe it.
2. **Propose the edit before saving.** Show Sondra the new text in plain language. "I'll update your direction to: [new text]. Sound right?" Then save after she confirms, or revise if she tweaks it.
3. **Keep it short and concrete.** One to three sentences, written in her voice, using specifics. Good: "Keep the tone encouraging and add warmth. More about tools that save time, less about what AI will replace." Bad: "Focus on positive content about productivity."
4. **Merge, don't replace, unless she says otherwise.** If she's adding a new focus, combine it with what's already there. If she's pivoting ("I'm done with X, now I care about Y"), you can replace.

## Input

```json
{ "direction": "The full new editorial direction text. Short, specific, in Sondra's voice." }
```

Empty string clears the direction.

## Returns

- `editorialDirection`: the saved text

## After saving

Briefly confirm what you saved. Mention that the topic scanner will use it the next time it runs, and that you'll carry it forward in future conversations. Don't over-narrate.

## What the direction does downstream

- The topic scanner reads it every time it runs and uses it as a steering note
- Future drafts reference it through their editorial memory digest
- You (the agent) see it in every `getDashboardData` call, so you stay aligned with her current focus without her re-explaining

## Never do this

- Don't update the direction silently without showing Sondra what you're about to write
- Don't overwrite the existing direction with a narrower one just because she mentioned one new angle
- Don't use corporate filler ("leverage", "synergize") or empty intensifiers. Match her voice
