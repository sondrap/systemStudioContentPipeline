---
name: Visual Identity
description: Visual identity guidelines for SystemStudio Pipeline
---

# Visual Identity

The pipeline tool looks and feels like part of systemstudio.ai. Same warm Linen background, same Bespoke Serif headlines, same Satoshi body text, same Deep Current and Sage Stone palette. The tool should feel like opening a private back-office section of the site, not a separate app.

~~~
The aesthetic is editorial and premium. Think luxury magazine, not tech blog. Clean, spacious, confident. This matches the main site's design language exactly.
~~~

## App Icon

![Pen nib icon in teal and brass on dark background](https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/eee84c19-5df7-44c3-aeed-fc6395964065.png?w=128)

The pen nib mark serves as the app icon in contexts outside the main site (favicon, app listings). Within the tool, use the "S" monogram favicon from the main site if needed for brand consistency.

## Surfaces and Depth

The app uses a light, airy surface model matching the main site:
- **Page background:** Linen (`#F7F4F2`)
- **Elevated surfaces:** White (`#FFFFFF`) for cards, panels, sidebars, modals
- **Borders:** `1px solid #D4E4F1` (Morning Mist) for card edges, dividers, input outlines

~~~
Derived implementation tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F7F4F2` | Page background (Linen) |
| `--surface` | `#FFFFFF` | Cards, panels, sidebar, modals |
| `--text-primary` | `#365367` | Headlines, body text, links (Deep Current) |
| `--text-secondary` | `#577267` | Meta info, captions, muted labels (Sage Stone) |
| `--text-tertiary` | `#57726780` | Placeholder text, disabled states (Sage Stone at 50% opacity) |
| `--accent` | `#ECD8DC` | CTA buttons, accent highlights (Blush Veil) |
| `--accent-hover` | `#E4CCD1` | Hover state for Blush Veil elements (slightly darker) |
| `--border` | `#D4E4F1` | Dividers, card borders, input outlines (Morning Mist) |
| `--border-active` | `#365367` | Focus rings, active input borders (Deep Current) |
| `--surface-hover` | `#F7F4F2` | Hover state on white cards (drops to Linen) |
| `--success` | `#577267` | Published states, completion (Sage Stone, contextual) |
| `--danger` | `#C85050` | Delete confirmations, error states |
| `--code-bg` | `#D4E4F1` | Code block backgrounds (Morning Mist) |

Links: Deep Current with Blush Veil underline, transition to Deep Current underline on hover.
~~~

No heavy shadows. Cards use a very subtle shadow: `box-shadow: 0 1px 3px rgba(54, 83, 103, 0.06)`. Elevated cards on hover: `box-shadow: 0 4px 12px rgba(54, 83, 103, 0.1)`.

## Component Styling

### Buttons

Primary buttons use Blush Veil background with Deep Current text. This matches the CTA style on systemstudio.ai.

~~~
Primary button:
```css
background: #ECD8DC; color: #365367; border: none; border-radius: 8px;
padding: 10px 20px; font-family: 'Satoshi'; font-size: 13px; font-weight: 500;
letter-spacing: 0.01em; transition: background 150ms ease-out, transform 100ms ease-out;
```
Hover: `background: #E4CCD1`. Active: `transform: scale(0.98)`.

Secondary (ghost):
```css
background: transparent; color: #365367; border: 1px solid #D4E4F1; border-radius: 8px;
```
Hover: `border-color: #365367; background: #36536708`.

Danger: ghost style, hover uses `border-color: #C8505060; color: #C85050`.
~~~

### Cards

Pipeline cards use white background with Morning Mist border.

~~~
```css
background: #FFFFFF; border: 1px solid #D4E4F1; border-radius: 12px; padding: 16px;
box-shadow: 0 1px 3px rgba(54, 83, 103, 0.06);
transition: box-shadow 150ms ease-out, transform 150ms ease-out;
```
Hover: `box-shadow: 0 4px 12px rgba(54, 83, 103, 0.1); transform: translateY(-1px)`.
~~~

### Input Fields

~~~
```css
background: #FFFFFF; border: 1px solid #D4E4F1; border-radius: 8px;
padding: 10px 14px; color: #365367; font-family: 'Satoshi'; font-size: 14px;
```
Focus: `border-color: #365367; box-shadow: 0 0 0 3px #36536712; outline: none`.
~~~

### Status Tags

Small pills using contextual colors at low opacity:

~~~
```css
height: 22px; padding: 0 10px; border-radius: 11px;
font-family: 'Satoshi'; font-size: 11px; font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase;
```
Per-stage colors:
- Researching: `background: #D4E4F1; color: #365367` (Morning Mist bg, Deep Current text)
- Drafting: `background: #57726715; color: #577267` (Sage Stone tint)
- Review: `background: #ECD8DC; color: #365367` (Blush Veil bg, Deep Current text)
- Published: `background: #57726720; color: #577267; border: 1px solid #57726730` (Sage Stone)
~~~

## Icons

Use Tabler Icons throughout with `stroke-width: 1.5`, color Deep Current (`#365367`). Key icons: `layout-kanban` (pipeline), `file-text` (editor), `message-circle` (chat), `archive` (backlog), `settings`, `arrow-up` (send), `dots` (overflow), `plus` (add), `search`, `grip-vertical` (drag handle), `external-link` (publish), `check` (approve).

## Motion

### Micro-interactions
- Button press: `scale(0.98)` on active, 100ms ease-out
- Card hover: `translateY(-1px)` + shadow lift, 150ms ease-out
- Focus ring: border color 150ms, box-shadow fade 200ms
- View switching: cross-fade 200ms opacity (not slide)
- Sidebar collapse: 250ms width ease-in-out, content fades at 150ms before/after

### Pipeline-specific
- Drag-and-drop: card scales to 1.02, gains shadow `0 8px 24px rgba(54,83,103,0.15)`, source column cards animate closed over 200ms
- Stage change: status tag color cross-fades 300ms

### Editor
- Content load: text fades in from opacity 0 with `translateY(4px)` over 300ms

### Chat
- Messages slide in from bottom with `translateY(12px)`, 250ms ease-out
- Typing indicator: three dots in Sage Stone with staggered opacity pulse, 1.2s loop

## Spacing

Use a consistent spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 pixels. Cards use 16px internal padding. Sections use 24px or 32px gaps. Page margins: 24px on desktop, 16px on mobile.

## Images

All images use `border-radius: 16px`. Article hero images display at full content width (680px max) with 1200:630 aspect ratio.
