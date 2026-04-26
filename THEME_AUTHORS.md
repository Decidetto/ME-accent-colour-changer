# Theme Authors Guide

This document describes how to make a Marinara Engine visual theme compatible
with the **Accent Color Changer** extension. The extension lets users rotate a
theme's accent and highlight colors with two hue sliders. To work coherently on
your theme, it needs to know which colors in your palette to rotate from.

If you skip this and a user installs Accent Color Changer with your theme
active, the sliders will still work — but the rotation will pull from the
default theme's pink/lavender bases, so the rotated UI will not match your
theme's identity. The fix is small: declare a handful of source variables
under your theme's selector.

---

## The contract

Define these CSS custom properties under your theme's selector. The extension
reads them via `getComputedStyle` to compute per-theme default slider
positions, and CSS rotates each variable by the matching slider shift.

### Highlight family (rotated by the **Highlight** slider)

| Variable | Role | What it should be in your theme |
|---|---|---|
| `--accent-changer-highlight` | Bold interactive accent — drives `--primary`, `--ring`, all highlight glows. | The most saturated interactive color in your theme (typically the same color you set `--primary` to). |
| `--accent-changer-highlight-soft` | Soft variant — drives `--pastel-rose` (used in scrollbar thumb hover and a few decorative spots). | A lighter, less saturated variant of your highlight. If your theme has nothing analogous, set it to your highlight's lighter cousin or just match `--accent-changer-highlight`. |

### Accent family (rotated by the **Accent** slider)

| Variable | Role | What it should be in your theme |
|---|---|---|
| `--accent-changer-accent-background` | Page background — drives `--background`. | The same color you set `--background` to. |
| `--accent-changer-accent-sidebar` | Sidebar surface — drives `--sidebar`. | The same color you set `--sidebar` to. |
| `--accent-changer-accent-surface` | Subtle surface — drives `--secondary` and `--muted`. | The same color you set `--secondary` (and/or `--muted`) to. |
| `--accent-changer-accent-surface-fg` | Foreground text on subtle surfaces. | The same color you set `--secondary-foreground` to. |
| `--accent-changer-accent-strong` | Emphasized accent surface — drives `--accent` (active tabs, hover backgrounds). | The same color you set `--accent` to. |
| `--accent-changer-accent-strong-fg` | Foreground on emphasized surfaces. | The same color you set `--accent-foreground` to. |
| `--accent-changer-accent-tint` | Dominant accent tint — drives `--border`, `--input`, `--muted-foreground`, `--sidebar-border`, and the accent glow stack. | The "tint" color that pervades your theme's borders, muted text, and subtle accents. In a near-grayscale theme this can be a desaturated blue/gray; in a saturated theme this is the dominant accent color. |
| `--accent-changer-accent-cool` | Cool accent — drives the cool stop in the glass gradient and `--glow-color-3`. | A cooler-toned palette member (typically a sky/cyan in warm-themed palettes; can be the same as `accent-tint` if your theme has no cool variant). |

---

## Format

**Use hex colors** (`#rrggbb` or `#rgb`).

The CSS rotation accepts any color format (`rgb()`, `hsl()`, `oklch()`, named
colors), so the rotation itself will work either way. But the extension's JS
needs to parse the source colors to compute the slider's "default position" —
the place on the rainbow that represents your theme's unrotated appearance.
That parser only reads hex. With non-hex sources, the slider positions fall
back to safe values (`270°` accent / `330°` highlight), meaning the slider
won't visually point at your theme's actual base hue when at "no rotation."

---

## Selector pattern

Match the pattern Marinara's built-in SillyTavern theme uses. Two blocks:
one for default + dark, one for light-mode overrides.

```css
/* Dark mode (and theme-active default) */
[data-visual-theme="my-theme"],
[data-visual-theme="my-theme"][data-theme="dark"] {
  --accent-changer-highlight: #...;
  --accent-changer-highlight-soft: #...;
  --accent-changer-accent-background: #...;
  --accent-changer-accent-sidebar: #...;
  --accent-changer-accent-surface: #...;
  --accent-changer-accent-surface-fg: #...;
  --accent-changer-accent-strong: #...;
  --accent-changer-accent-strong-fg: #...;
  --accent-changer-accent-tint: #...;
  --accent-changer-accent-cool: #...;
}

/* Light-mode overrides — only re-list what differs from the dark block */
[data-visual-theme="my-theme"][data-theme="light"] {
  --accent-changer-highlight: #...;
  --accent-changer-accent-background: #...;
  /* …etc. for any color that needs a different value in light mode… */
}
```

---

## Worked example: SillyTavern

This is shipped in the extension. It's the canonical reference if you want
to copy-and-adapt:

```css
[data-visual-theme="sillytavern"],
[data-visual-theme="sillytavern"][data-theme="dark"] {
  --accent-changer-highlight: #4a72b0;            /* ST primary blue */
  --accent-changer-highlight-soft: #9090b8;
  --accent-changer-accent-background: #0b0b0f;
  --accent-changer-accent-sidebar: #0e0e14;
  --accent-changer-accent-surface: #16161e;
  --accent-changer-accent-surface-fg: #c0bfcf;
  --accent-changer-accent-strong: #1e1e2e;
  --accent-changer-accent-strong-fg: #cccccc;
  --accent-changer-accent-tint: #8888a0;
  --accent-changer-accent-cool: #50a0b0;
}

[data-visual-theme="sillytavern"][data-theme="light"] {
  --accent-changer-highlight: #3a609a;
  --accent-changer-accent-background: #e8e8ec;
  --accent-changer-accent-sidebar: #dddde4;
  --accent-changer-accent-surface: #d8d8e0;
  --accent-changer-accent-surface-fg: #2a2a3e;
  --accent-changer-accent-strong: #d4d4de;
  --accent-changer-accent-strong-fg: #1a1a24;
  --accent-changer-accent-tint: #606078;
  /* highlight-soft and accent-cool inherit from the dark block. */
}
```

---

## Optional: tuning the auto-contrast threshold

The extension auto-flips text on `--primary` buttons between black and white
based on the rotated primary's OKLCH lightness, so that yellow/cyan
rotations don't end up with unreadable white-on-yellow buttons.

Default threshold is `0.89`, calibrated for the engine's pink (OKLCH L≈0.88,
which stays under the threshold and gets white text). If your theme's
highlight base has a notably different lightness profile and you want the
flip to happen at a different point, override it:

```css
[data-visual-theme="my-theme"] {
  --accent-changer-fg-threshold: 0.75;
}
```

Most themes can leave this at the default.

---

## What the extension deliberately won't touch

- **Scrollbars.** Our scrollbar rule sits at lower specificity than visual
  themes on purpose — themes that style their own scrollbar (like ST's flat
  transparent track) keep that styling.
- **Glass / glow / decorative effects.** The extension only sets *colors*,
  never enables or disables the effects that consume them. Themes that turn
  off glass/glow keep them off.
- **`--destructive` and `--destructive-foreground`.** Red stays red, in any
  rotation. Danger colors are semantically meaningful and must not change.

---

## Quick sanity test

Once your theme defines the source variables, install the extension and
confirm:

1. **Default slider positions reflect your palette.** Open the popover. The
   slider degree labels should match your theme's actual base hues, and
   the swatches next to each slider should look like your theme's accent
   and highlight colors. If they don't, you probably used non-hex values
   somewhere.
2. **Reset returns to your theme, not the engine's.** Drag both sliders to
   weird places, click *Reset*, and the UI should snap back to your theme's
   stock appearance — not pink/lavender.
3. **Highlight slider visibly rotates `--primary`.** Drag it to `0°` (red),
   `120°` (green), `240°` (blue). Buttons that use `--primary` should clearly
   shift hue.
4. **Accent slider visibly rotates surfaces.** Drag it through the same hues.
   Card backgrounds, borders, sidebar, and active-tab highlights should
   shift in sympathy. Subtle on near-grayscale themes (expected); pronounced
   on saturated themes.
5. **Toggling the extension off restores your theme.** With sliders rotated,
   disable the extension via Settings → Extensions. The UI should
   instantly return to your theme's defaults — no lingering rotation.

If any of those misbehave, the most common cause is a missing or non-hex
source variable. Check the Computed pane on `<html>` in DevTools and look
for any `--accent-changer-*` value that isn't your expected hex.
