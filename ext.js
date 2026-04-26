// Accent Color Changer — UI + persistence layer.
// CSS overrides live in ext.css; this file only sets the rotation CSS variables
// on :root, renders the popover UI, and persists the slider values.
//
// Naming conventions used throughout:
//   --accent-changer-*-shift   CSS custom properties holding the relative shift
//                              (degrees) applied to the family's source color.
//   accent-changer-*-hue       localStorage keys holding the absolute hue the
//                              user set (0-360, calibrated so 0 = red).
// Storage holds the absolute hue; CSS holds the shift. The two differ because
// the shift depends on the active theme's base color, which changes as themes
// switch — but the user's chosen absolute hue stays constant.

// ─── Phase 1: Constants & namespacing ──────────────────────────────────────

const STORAGE_ACCENT = "accent-changer-accent-hue";
const STORAGE_HIGHLIGHT = "accent-changer-highlight-hue";
const VAR_ACCENT = "--accent-changer-accent-shift";
const VAR_HIGHLIGHT = "--accent-changer-highlight-shift";

// Last-resort fallback hues for when --accent-changer-src-* can't be parsed
// (e.g. a theme defines the source as rgba(...) instead of #hex). These
// match the engine's default theme.
const SAFE_FALLBACK = { accent: 270, highlight: 330 };

const EXTENSION_NAME = marinara.extensionName || "Accent Color Changer";
const TOGGLE_ID = `accent-changer-toggle-${marinara.extensionId || "x"}`;

// Lucide settings-2 icon (https://lucide.dev/icons/settings-2).
const SETTINGS_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="0.875rem" height="0.875rem" ' +
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20 7h-9"></path>' +
  '<path d="M14 17H5"></path>' +
  '<circle cx="17" cy="17" r="3"></circle>' +
  '<circle cx="7" cy="7" r="3"></circle>' +
  "</svg>";

// ─── Phase 2: Color parsing ────────────────────────────────────────────────

function hexToHue(hex) {
  let s = String(hex || "").replace(/^#/, "").trim();
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (s.length !== 6 || /[^0-9a-f]/i.test(s)) return null;
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0; // grayscale — hue is undefined; treat as 0.
  const d = max - min;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

// ─── Phase 3: Theme integration ────────────────────────────────────────────

function readBaseHue(varName, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const hue = hexToHue(value);
  return hue === null ? fallback : hue;
}

function computeDefaults() {
  return {
    accent: readBaseHue("--accent-changer-src-mid", SAFE_FALLBACK.accent),
    highlight: readBaseHue("--accent-changer-src-pink", SAFE_FALLBACK.highlight),
  };
}

// ─── Phase 4: Persistence helpers ──────────────────────────────────────────

function loadHue(key, defaultHue) {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultHue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : defaultHue;
}

function saveHue(key, hue, defaultHue) {
  if (hue === defaultHue) localStorage.removeItem(key);
  else localStorage.setItem(key, `${hue}`);
}

function applyHue(cssVar, hue, defaultHue) {
  document.documentElement.style.setProperty(cssVar, `${hue - defaultHue}`);
}

// ─── Phase 5: Module state & initial apply ─────────────────────────────────

let defaults = computeDefaults();

const state = {
  accent: loadHue(STORAGE_ACCENT, defaults.accent),
  highlight: loadHue(STORAGE_HIGHLIGHT, defaults.highlight),
};

function applyAll() {
  applyHue(VAR_ACCENT, state.accent, defaults.accent);
  applyHue(VAR_HIGHLIGHT, state.highlight, defaults.highlight);
}

applyAll();

// ─── Phase 6: Theme observer ───────────────────────────────────────────────
// Re-derive defaults and re-apply when the theme changes, so the rotation
// stays anchored to whichever theme is currently active. refreshSliders is
// declared here (alongside its primary caller) but reads the `popover`
// binding from Phase 8; MutationObserver callbacks fire asynchronously, so
// by the time refreshSliders runs Phase 8 has initialized `popover` to null
// and the guard catches the popover-closed case.

function refreshSliders() {
  if (!popover) return;
  const rows = popover.querySelectorAll(".accent-changer-row");
  if (rows[0]) {
    rows[0].querySelector('input[type="range"]').value = `${state.accent}`;
    rows[0].querySelector(".accent-changer-value").textContent = `${state.accent}°`;
  }
  if (rows[1]) {
    rows[1].querySelector('input[type="range"]').value = `${state.highlight}`;
    rows[1].querySelector(".accent-changer-value").textContent = `${state.highlight}°`;
  }
}

const themeObserver = new MutationObserver(() => {
  const next = computeDefaults();
  // If the user hadn't customized a knob, snap state to the new theme's base.
  if (localStorage.getItem(STORAGE_ACCENT) === null) state.accent = next.accent;
  if (localStorage.getItem(STORAGE_HIGHLIGHT) === null) state.highlight = next.highlight;
  defaults = next;
  applyAll();
  refreshSliders();
});
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme", "data-visual-theme"],
});

// ─── Phase 7: Popover styles ───────────────────────────────────────────────

marinara.addStyle(`
  .accent-changer-toggle {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0.125rem;
    border-radius: 0.25rem;
    color: var(--muted-foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, color 0.15s;
  }
  .accent-changer-toggle:hover { transform: scale(1.1); color: var(--foreground); }
  .accent-changer-popover {
    position: fixed;
    z-index: 10000;
    background: var(--popover);
    color: var(--popover-foreground);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 1rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    min-width: 300px;
    backdrop-filter: blur(12px);
    font-size: 0.75rem;
  }
  .accent-changer-popover h3 {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
  }
  .accent-changer-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .accent-changer-label {
    min-width: 4.5em;
    font-weight: 500;
  }
  .accent-changer-preview {
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 50%;
    border: 1px solid var(--border);
    flex-shrink: 0;
  }
  .accent-changer-preview-accent {
    background: hsl(from var(--accent-changer-src-mid) calc(h + var(--accent-changer-accent-shift, 0)) s l);
  }
  .accent-changer-preview-highlight {
    background: hsl(from var(--accent-changer-src-pink) calc(h + var(--accent-changer-highlight-shift, 0)) s l);
  }
  .accent-changer-row input[type="range"] {
    flex: 1;
    appearance: none;
    -webkit-appearance: none;
    height: 0.5rem;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      hsl(0 100% 50%) 0%,
      hsl(60 100% 50%) 16.67%,
      hsl(120 100% 50%) 33.33%,
      hsl(180 100% 50%) 50%,
      hsl(240 100% 50%) 66.67%,
      hsl(300 100% 50%) 83.33%,
      hsl(360 100% 50%) 100%
    );
    outline: none;
    cursor: pointer;
  }
  .accent-changer-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.55);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
    cursor: grab;
  }
  .accent-changer-row input[type="range"]::-webkit-slider-thumb:active { cursor: grabbing; }
  .accent-changer-row input[type="range"]::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.55);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
    cursor: grab;
  }
  .accent-changer-value {
    font-variant-numeric: tabular-nums;
    min-width: 3em;
    text-align: right;
    color: var(--muted-foreground);
  }
  .accent-changer-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.75rem;
  }
  .accent-changer-action {
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--secondary-foreground);
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .accent-changer-action:hover {
    background: var(--accent);
    border-color: var(--ring);
  }
`);

// ─── Phase 8: Popover behavior ─────────────────────────────────────────────

let popover = null;

function closePopover() {
  document.removeEventListener("mousedown", outsideClickHandler);
  if (popover) {
    popover.remove();
    popover = null;
  }
}

function outsideClickHandler(e) {
  if (!popover) return;
  if (popover.contains(e.target)) return;
  if (e.target.closest && e.target.closest(".accent-changer-toggle")) return;
  closePopover();
}

function buildSliderRow(label, previewClass, value) {
  return `
    <div class="accent-changer-row">
      <span class="accent-changer-label">${label}</span>
      <span class="accent-changer-preview ${previewClass}" aria-hidden="true"></span>
      <input type="range" min="0" max="360" step="1" value="${value}" aria-label="${label} hue rotation">
      <span class="accent-changer-value">${value}°</span>
    </div>
  `;
}

function openPopover(anchor) {
  if (popover) {
    closePopover();
    return;
  }

  popover = document.createElement("div");
  popover.className = "accent-changer-popover";
  popover.innerHTML = `
    <h3>Pick Hues</h3>
    ${buildSliderRow("Accent", "accent-changer-preview-accent", state.accent)}
    ${buildSliderRow("Highlight", "accent-changer-preview-highlight", state.highlight)}
    <div class="accent-changer-actions">
      <button class="accent-changer-action" data-act="reset">Reset</button>
      <button class="accent-changer-action" data-act="close">Close</button>
    </div>
  `;
  document.body.appendChild(popover);

  const rect = anchor.getBoundingClientRect();
  const top = Math.min(rect.bottom + 6, window.innerHeight - popover.offsetHeight - 8);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8));
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;

  const rows = popover.querySelectorAll(".accent-changer-row");
  const wireRow = (row, family, cssVar, storageKey) => {
    const slider = row.querySelector('input[type="range"]');
    const valueEl = row.querySelector(".accent-changer-value");
    slider.addEventListener("input", () => {
      const hue = Number.parseInt(slider.value, 10) || 0;
      state[family] = hue;
      valueEl.textContent = `${hue}°`;
      applyHue(cssVar, hue, defaults[family]);
      saveHue(storageKey, hue, defaults[family]);
    });
  };
  wireRow(rows[0], "accent", VAR_ACCENT, STORAGE_ACCENT);
  wireRow(rows[1], "highlight", VAR_HIGHLIGHT, STORAGE_HIGHLIGHT);

  popover.querySelector('[data-act="reset"]').addEventListener("click", () => {
    state.accent = defaults.accent;
    state.highlight = defaults.highlight;
    applyAll();
    saveHue(STORAGE_ACCENT, defaults.accent, defaults.accent);
    saveHue(STORAGE_HIGHLIGHT, defaults.highlight, defaults.highlight);
    refreshSliders();
  });

  popover.querySelector('[data-act="close"]').addEventListener("click", closePopover);

  setTimeout(() => document.addEventListener("mousedown", outsideClickHandler), 0);
}

// ─── Phase 9: Toggle button injection ──────────────────────────────────────
// We can't ship UI inside the engine's per-extension card directly, so we
// inject a settings-icon button that toggles our popover. The card is
// identified by matching the extension's name text (no stable data-*
// selector exists). Polling is cheap because the function short-circuits
// when the button is already attached.

function tryInjectToggle() {
  if (document.getElementById(TOGGLE_ID)) return;

  const candidates = document.querySelectorAll("span.font-medium.truncate");
  for (const span of candidates) {
    if (!span.textContent || span.textContent.trim() !== EXTENSION_NAME) continue;

    const card = span.closest('[class*="rounded-lg"]');
    if (!card) continue;

    const trash = card.querySelector('button[title="Remove extension"]');
    if (!trash) continue;

    const toggle = document.createElement("button");
    toggle.id = TOGGLE_ID;
    toggle.className = "accent-changer-toggle";
    toggle.title = "Hue settings";
    toggle.innerHTML = SETTINGS_ICON_SVG;
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      openPopover(toggle);
    });

    card.insertBefore(toggle, trash);
    return;
  }
}

marinara.setInterval(tryInjectToggle, 500);
tryInjectToggle();

// ─── Phase 10: Cleanup ─────────────────────────────────────────────────────

marinara.onCleanup(() => {
  closePopover();
  themeObserver.disconnect();
  const root = document.documentElement;
  root.style.removeProperty(VAR_ACCENT);
  root.style.removeProperty(VAR_HIGHLIGHT);
});
