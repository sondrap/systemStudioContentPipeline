---
name: Typography
type: design/typography
---

```typography
fonts:
  Bespoke Serif:
    src: https://api.fontshare.com/v2/css?f[]=bespoke-serif@300,400,500,700,800&display=swap
  Satoshi:
    src: https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap

styles:
  Display:
    font: Bespoke Serif
    size: 36px
    weight: 500
    letterSpacing: -0.015em
    lineHeight: 1.2
    description: Page titles, article headlines. Roman (not italic). Deep Current.
  Body:
    font: Satoshi
    size: 17px
    weight: 400
    lineHeight: 1.65
    description: Default reading and interface text. Deep Current. Max reading width 680px.
```

~~~
Additional derived styles matching systemstudio.ai:

| Style | Font | Size | Weight | Notes |
|-------|------|------|--------|-------|
| Section Header (H2) | Bespoke Serif | 28px | 500 | Line-height 1.25. Deep Current. |
| Sub-heading (H3) | Satoshi | 20px | 600 | Line-height 1.35. Deep Current. |
| Card Title | Bespoke Serif | 24px | 500 | Article titles on pipeline cards and listings. |
| UI Label | Satoshi | 13px | 500 | Button text, form labels, navigation items. |
| Caption / Small | Satoshi | 14px | 400 | Line-height 1.5. Sage Stone. |
| Pull Quote | Bespoke Serif | 24px | 400 italic | Line-height 1.35. Sage Stone. On Morning Mist background. |
| Overline / Meta | Satoshi | 12px | 500 | Uppercase. Letter-spacing 0.08em. Sage Stone. |
| Code | System monospace | 15px | 400 | On Morning Mist background, 16px padding, border-radius 8px. |

Font loading order: Satoshi first (UI font), then Bespoke Serif. Use `font-display: swap`.
~~~
