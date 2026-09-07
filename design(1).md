# Waypic — Design Doc

## 0. What changed in this revision

Two prior revisions covered the Homepage and Editor frames end‑to‑end via Figma Dev Mode. This revision adds **component‑level states** fetched the same way — the individual pieces that don't show all their variants when you only look at a single static frame:

| Component | Node | States found |
|---|---|---|
| `Toolbar/Desktop` (sidebar) | `99:2743` | Single state — confirms everything already documented, no changes |
| `FileUpload` (dropzone) | `93:939` | Only **Default** exists in Figma. **A hover state is being added in this revision per explicit direction: border switches from dashed gray to solid `primary`.** Not yet in Figma itself — flag to add there too so code and design don't drift. |
| `Attachment` (file chip) | `93:951` | **Default / Uploading / Error** — this fills in several things the PRD asked for that neither prior screen showed |
| `Button` ("Continue to Editor") | `93:1282` | **Default / Hover / Pressed** |
| `FilePreview` (slide‑deck card) | `5:183`, `5:101` | **Default / Active** only — confirms the prior finding, no hover variant exists |
| `Switch` | `95:2283` | **Off / On** — the one thing missing from every previous screen |

**Addendum, this pass**: fetched `ToggledSection` (`98:2432`) directly — it exposes a boolean `state` prop, which confirms the panel's on/off appearance in one place and **corrects** a QA flag from the previous pass (see §3.2 and §8.3): what looked like two different valid background implementations is actually one canonical behavior plus one instance that deviates from its own component.

**Addendum, product decisions round**: §7 has been rewritten from a list of open gaps into a record of decisions made this round (map‑type provider shortlist researched fresh, Google Fonts direction, font‑size range, file formats, error‑copy handling, no‑map/JPG resolution) — one item (§7.0, the scope selector) still needs your direct answer before it can be marked resolved.

Tags: **[Figma]** read directly from Dev Mode · **[Spec — added this revision]** a decision made in this session, not (yet) reflected in the Figma file itself · **[Inferred]** reasoned from a consistent pattern, still not directly confirmed · **[Gap — PRD]** required by the PRD, absent everywhere · **[QA flag]** an inconsistency in the file itself.

---

## 1. Overview

**Waypic**: a free, no‑account, client‑side web app that turns uploaded `.gpx` files into a shareable, styled route image (map + stats overlay). Two screens: **Landing/Upload** and **Editor/Export**. Everything runs in‑browser; no backend beyond map tiles and optional reverse geocoding (per PRD §8).

Footer copy on the landing page: **"© 2026 gpsvisualiser.com. Made with love by Anja Ferjancic."** — transcribed as‑is; confirm whether this is real production copy before shipping.

---

## 2. Design Tokens — from Figma variables **[Figma]**

### 2.1 Color

| Variable | Hex | Used for |
|---|---|---|
| `primary` | `#3B2FD7` | Primary buttons, selected borders, slider progress |
| `primary-hover` | `#6155F5` | Selected slide‑deck card number · "Uploading" status text/percentage on file chips · hover border on the "Continue to Editor" button |
| `error` | `#DC2626` | Error‑state file chip label + message (exact Tailwind `red-600`) |
| `text` | `#0F172A` | Default body/heading text (exact `slate-900`) |
| `text-secondary` | `#8E8E93` | Section labels, unselected segmented text, default (non‑error/uploading) chip metadata |
| `border` | `#E2E8F0` | Borders, dividers (exact `slate-200`) |
| `background` | `#FFFFFF` | Cards, sidebar, selects, buttons |
| `surface` | `#F8F9FB` | Editor canvas backdrop, one `ToggledSection` variant |
| `surface-selected` | `#F7F6FE` | Selected slide‑deck card background, **and** the `ToggledSection` panel background once its switch is on — a genuine semantic "this is active/engaged" token, not card‑specific |
| `slate/400` | `#94A3B8` | Defined, still not observed used anywhere fetched so far |
| `icon/default` | `#18272F` | Icon fills — distinct from `text` |
| — (unbound) | `#0046A9` | The "browse your device." link |

`primary-hover`'s name is now fully explained: it's a genuine **hover/emphasis** semantic color, consistently used across three unrelated components (card number, uploading status, button hover border) — not a one‑off. Treat it as a real design‑system token (`--primary-hover` / Tailwind `primary-600` equivalent), not an incidental value.

### 2.2 Radius

| Variable | Value | Used for |
|---|---|---|
| `sm` | `6px` | `Select` triggers only |
| `md` | `8px` | Segmented buttons, `ToggledSection` panels, thumbnails, header buttons, dropzone, file chips |
| `lg` | `16px` | Sidebar container, selected slide‑deck card, slider track, **and the "Continue to Editor" button** — at that button's height this reads as a near‑full pill, without needing a separate `full` value |
| `full` | `50px` | The circular remove button on the selected slide‑deck card |

### 2.3 Shadow

| Name | CSS | Used for |
|---|---|---|
| `Shadow/Small` | `0px 1px 3px 0px rgba(0,0,0,0.12)` | Dropzone, sidebar container, file chips (all three `Attachment` states) |
| `M3/Elevation Light/1` | `0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)` | Slide‑deck `SidePanel` container |
| `Shadow/Medium` | `0px 4px 8px 0px rgba(0,0,0,0.12)` | **New this revision** — the "Continue to Editor" button (its Default state has a visibly heavier shadow than everything else in the file) |
| (unnamed, close variant) | `drop-shadow(0px 1px 1.5px rgba(0,0,0,0.12))` | Floating remove button on the selected slide‑deck card |

**[QA flag]** — now four near‑duplicate small/medium shadow values exist rather than a clean 2‑step scale (`sm`/`md`). Recommend consolidating to two tokens post‑launch; not blocking for v1.

### 2.4 Typography

| Style | Font | Size / Line‑height / Tracking | Used for |
|---|---|---|---|
| `Display` | Inter Bold | 48 / 56 / ‑1.5px | Hero heading |
| `Heading` | Inter Semi Bold | 24 / 32 / ‑0.5px | Homepage subhead, dropzone heading, Editor "File name" |
| `Body` | Inter Regular | 14 / 20 / 0 | Field labels, `Select` values, dropzone description |
| `Label` | Inter Medium | 14 / 20 / 0 | Section labels, segmented‑button text, footer, **file‑chip filename** |
| `body-medium` | Inter Medium | 14 / **24** / 0 | Editor header button text |
| `Small` | Inter Regular | **12 / 16** / 0 | **New this revision** — file‑chip metadata line ("Gpx · 8KB", "Uploading · 80%", "Error · File is too big…") |
| `Static/Title Small` | — | 14 / 20 / **0.1px** | Unselected slide‑deck card numbers |
| Wordmark | **Grandstander Bold** | 56px (Homepage) / 24px (Editor) | "Waypic" |

### 2.5 Ready‑to‑paste tokens

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;   /* #0f172a */

    --primary: 244.3 67.7% 51.4%;      /* #3b2fd7 */
    --primary-hover: 243.5 89.4% 68.6%;/* #6155f5 */
    --primary-foreground: 0 0% 100%;

    --destructive: 0 72.2% 50.6%;      /* #dc2626 — "error" */
    --destructive-foreground: 0 0% 100%;

    --muted: 220 27.3% 97.8%;          /* #f8f9fb — "surface" */
    --muted-foreground: 240 2.3% 56.7%;/* #8e8e93 — "text-secondary" */

    --accent: 248 90.3% 96.9%;         /* #f7f6fe — "surface-selected" */
    --accent-foreground: 244.3 67.7% 51.4%;

    --border: 214.3 31.8% 91.4%;       /* #e2e8f0 */
    --input: 214.3 31.8% 91.4%;
    --ring: 244.3 67.7% 51.4%;

    --icon: 195.7 25.2% 15.1%;         /* #18272f */

    --radius-sm: 0.375rem;  /* 6px */
    --radius-md: 0.5rem;    /* 8px */
    --radius-lg: 1rem;      /* 16px */
    --radius-full: 9999px;

    --shadow-sm: 0px 1px 3px 0px rgb(0 0 0 / 0.12);
    --shadow-md: 0px 4px 8px 0px rgb(0 0 0 / 0.12);
  }
}
```

---

## 3. Component Pattern Library

### 3.1 Segmented control — two selection patterns

Unchanged from the prior revision — see the earlier notes on **Pattern A** (Format/Units: border‑only selection signal, text stays `text` on both states) vs **Pattern B** (Route Colour/Gradient, elevation color/Gradient: border **and** text change, unselected text drops to `text-secondary`).

### 3.2 Grouped‑toggle panel (`ToggledSection`) **[Figma]** — now confirmed on **and** off

Fetching the component itself (`98:2432`, which exposes a boolean `state` prop) resolves this cleanly — and corrects the previous revision's QA flag, which mischaracterized what's actually going on.

`padding: 4px 8px 8px`, `rounded-md` in both states. What changes:

| | Off | On |
|---|---|---|
| Panel background | `rgba(226,232,240,0.25)` (translucent `slate-200`) | `surface-selected` (`#F7F6FE`) — **the same token used for the selected slide‑deck card** |
| Switch | off‑asset, `gap-8` layout | on‑asset, `justify-between` layout |
| Interval presets | all four: `text-secondary` + `border-border` (uniformly muted/disabled‑looking) | **first preset** ("5km"): `text-foreground` + `border-primary` (selected) · **other three**: `text-foreground` + `border-border` (available, just not picked) |

So the presets actually have **three** visual states, not two: *disabled* (switch off — muted text, gray border), *available* (switch on, not selected — normal text, gray border), *selected* (switch on, this one picked — normal text, primary border). This is a cleaner, more complete pattern than the prior revision's two‑state description.

**Corrected QA flag**: the previous revision treated "Show distance markers" (`rgba(226,232,240,0.25)`) and "Show elevation profile" (flat `#F8F9FB`) as two equally‑valid implementations of the same component. They aren't — this component fetch shows the canonical **off** background is `rgba(226,232,240,0.25)`. The "Show elevation profile" instance's flat `#F8F9FB` is a genuine deviation from its own component, not an alternate pattern — worth fixing to match the component rather than picking either value as the new standard.

**Minor copy nit**: the off‑state labels have a space ("5 km") and the on‑state labels don't ("5km") — almost certainly an unintentional inconsistency in the source file, not a deliberate style change between states. Normalize to one format (recommend keeping the space, "5 km", for readability) when building.

### 3.3 Switch **[Figma]** — now confirmed

```tsx
// Off
<div className="flex items-center gap-2 h-8 pr-2 w-[268px]">
  <p className="flex-1 text-sm text-foreground">Show distance markers</p>
  <img src={toggleOff} className="w-11 h-6" /> {/* light gray track, thumb left */}
</div>

// On
<div className="flex items-center justify-between h-8 pr-2 w-[268px]">
  <p className="flex-1 text-sm text-foreground">Show distance markers</p>
  <img src={toggleOn} className="w-11 h-6" /> {/* solid primary track, white thumb right */}
</div>
```
Rendered as a pre‑built SVG asset per state rather than composed from separate track/thumb elements in Figma — replicate the visual (44×24px, off = light gray track, on = solid `primary` fill with a white thumb on the right) using Radix `Switch` rather than trying to import the SVGs directly. **This confirms the inference from the prior revision was correct**: the on‑state color is `primary`, matching every other active/selected state in the file.

### 3.4 `FileUpload` (dropzone) hover state **[Spec — added this revision]**

Figma only defines a **Default** state for this component (`border-2 border-dashed border-border`, `rounded-md`, `Shadow/Small`). Per explicit direction this revision:

> On hover, the dropzone's border switches from dashed gray to a **solid `primary`** outline.

```tsx
className={cn(
  "border-2 rounded-md transition-colors",
  isDragOver || isHovered
    ? "border-solid border-primary"
    : "border-dashed border-border"
)}
```
Recommend treating drag‑over and mouse‑hover identically (both get the solid‑primary treatment) unless product wants to distinguish "you're hovering" from "you're about to drop a file here." **This state doesn't exist in the Figma file yet** — worth adding it there too so the two stay in sync as the file evolves.

### 3.5 `Attachment` (file chip) **[Figma]** — Default / Uploading / Error

This is the file‑chip component used in the Homepage's attached‑files state, and it directly answers several things the PRD asked for that neither screen showed on its own.

`382px` wide, `56px` tall, white, `border-border`, `rounded-md`, `Shadow/Small`, `padding: 8px`, `flex justify-between`. Filename: `Label` style (Inter Medium 14px), always `text-foreground`. Metadata line: `Small` style (Inter Regular 12px), with a small `StatusDot` icon between the status word and the value:

| State | Status text | Value text | Color | Copy |
|---|---|---|---|---|
| **Default** | "Gpx" | "8KB" | `text-secondary` | — |
| **Uploading** | "Uploading" | "80%" | `primary-hover` | Implies a real‑time percentage, not just an indeterminate spinner |
| **Error** | "Error" | "File is too big, max limit is 20MB" | `error` (`#DC2626`) | Matches the PRD's 20MB‑per‑file cap exactly |

Close (✕) button: top‑right, `16px`, present in all three states (even mid‑upload and on error — a file can always be removed).

**This resolves several PRD/§9 error‑and‑loading gaps directly**: "File too large → inline error with the size limit stated" (✅, exact copy confirmed), "Progress/parsing state per file" (✅, percentage‑based). Still not shown: the *specific* copy for "unsupported file type" or "too many files" errors, or a parse‑failure‑after‑upload state (this only covers pre/during‑upload states) — those remain **[Gap — PRD]**.

### 3.6 Button — "Continue to Editor" **[Figma]** — Default / Hover / Pressed

- **Default**: `bg-primary`, white text (`body-medium`... actually `Label` style per the fetched node — Inter Medium 14/20), `rounded-lg` (16px, reads as a full pill at this button's height), `gap-8` between label and `ArrowRight` icon (24px), `Shadow/Medium`.
- **Hover**: adds an asymmetric border in `primary-hover` — `border-bottom: 2px`, `border-left/right: 1px` — and the label‑to‑icon gap **increases from 8px to 16px**, visually sliding the arrow to the right. Background stays solid `primary` (no darkening).
- **Pressed**: identical classes to Default in the fetched code — Figma doesn't yet encode a visually distinct pressed state. Recommend falling back to the existing Motion spec (`whileTap={{ scale: 0.97 }}`) rather than inventing a new static style.

**[QA flag]**: this button uses a materially different visual language (pill shape, drop‑shadow, growing icon‑gap on hover) than the Editor's "Export selected"/"Export all" buttons (flat `rounded-md`, no shadow, no hover state defined at all). These read as two genuinely different button components rather than one Button with variants — confirm that's intentional (primary marketing‑style CTA vs. utilitarian in‑app action buttons) rather than a design‑system gap where the Editor buttons are simply missing hover/pressed states that should exist too.

### 3.7 Slide‑deck card (`FilePreview`) — reconfirmed, one correction

Two Dev Mode fetches (`5:183` standalone, `5:101` in‑context) both show only **Default** and **Active** variants — **no hover state exists in Figma for unselected cards**. The prior revision's recommendation to "show the remove ✕ on hover" for unselected cards is therefore **[Inferred]**, not a confirmed Figma spec — worth a direct product/design decision: either add a hover variant to the component in Figma, or decide unselected cards simply never show a remove affordance (select first, then remove).

Also newly noted **[QA flag]**: the base `SidePanel` component (`5:101`) defines its own padding as `8px`, but the actual instance placed in the Editor frame (`95:1322`) overrides it to `24px`. Not a functional bug (the override is presumably deliberate), but worth confirming which is meant to be the "real" default before other instances of this panel get built from the un‑overridden 8px version by mistake.

---

## 4. Goals & Non‑Goals

*(from PRD §2–3, unchanged)*

**Goals**: upload‑to‑export in under 2 minutes, zero learning curve · feel like a capable design tool, ship v1 small · every control state designed up front.

**Non‑goals (v1)**: no accounts/saved projects/history · no route editing/live tracking/social features · no native app.

---

## 5. User Flows

1. Land on Homepage → hero + subhead over the blurred‑screenshot‑plus‑green‑overlay background.
2. Drag/drop or browse‑select `.gpx` file(s) → each renders as an `Attachment` chip, starting in **Uploading** (with live percentage), settling into **Default** or **Error** (§3.5).
3. Dropzone itself gets a solid‑primary hover border while dragging over it (§3.4).
4. "Continue to Editor" appears once ≥1 file is in a non‑error `Default` state — pill‑shaped, `Shadow/Medium`, hover slides its arrow icon right (§3.6).
5. Editor opens, first file auto‑selected; canvas shows a live‑rendered map (still an open question whether this or "no‑map" is the true v1 default — see §11).
6. Sidebar groups: Map → Route → Typography → Stats → Export (§6.2's table remains the authoritative control list).
7. Export via the two header buttons.

**Branches**: remove a file via ✕ at any point, including mid‑upload or in an error state · map tile fetch fails → fallback + notice **[Gap — PRD]** · export fails → error message **[Gap — PRD]**.

---

## 6. Screens

### 6.1 Homepage **[Figma]** (`93:859`)

Layout, copy, and token values unchanged from the previous revision (see §2 for exact tokens) — full‑bleed blurred/tinted background photo, centered wordmark/hero/subhead/dropzone, `rounded-t-32px` translucent footer bar.

**Attached‑files state** — now fully specified via the `Attachment` component (§3.5) rather than pixel‑sampled: a grid of file chips below the dropzone, each independently in Default/Uploading/Error, plus the "Continue to Editor" button (§3.6) once ready.

### 6.2 Editor **[Figma]** (`95:1322`)

Structure, exact positioning, and the full sidebar section table are unchanged from the previous revision — Menubar (64px) → SidePanel (flush left, `M3/Elevation Light/1`) → Main canvas (931×1053, floating) → Toolbar (420px floating card, `Shadow/Small`). See §3 above for the corrected component‑level behavior (Switch, segmented‑control patterns, slide‑deck card states) that sits inside this structure.

---

## 7. Product decisions — responses to the prior Gaps list

Most of the previous "Gaps" list has been resolved this round. One needs a clarifying answer before it can move forward; it's called out first.

### 7.0 Scope selector — clarification needed

To restate what this meant, since it wasn't clear: PRD §7 describes a **live, in‑editor control** — literally a toggle in the toolbar reading something like "Apply to: this image / all images" — that would let someone change a setting (say, turn on the elevation profile) once and have it immediately apply to *every* uploaded file, not just the one currently selected, **while still editing**, before export. That's different from what's actually in Figma today, which only offers scope at **export time** via the two footer buttons: "Export selected" (whatever style is currently showing) vs. "Export all (N) .zip" (which either exports every file with its *own* individually‑saved settings, or stamps the current file's settings onto all of them at export time — **that second half is still the open question**). So concretely: is a live "apply to all" toggle still wanted while editing, or is export‑time-only scope (as built) the whole story? And if it's export‑time only, does "Export all" use each file's own settings or copy the selected file's settings onto everything? Still needs your call.

### 7.1 Overlays — resolved

The overlays in **Stats** (distance / duration / pace / elevation / elevation profile) are the complete, final v1 set — confirmed. Activity name, start/end markers, place name, date/time, and HR/cadence/power are **not** planned for v1; they were only ever PRD ideas, not a current gap. A future *templates* feature might display overlays differently (e.g., outside the map rather than on top of it), but that's out of scope for now and doesn't change what ships.

### 7.2 Distance‑marker interval — resolved

The four fixed presets (5/10/15/20 km) are the intentional design, not a placeholder for a future dropdown/stepper. No further work needed here beyond what's already documented in §3.2.

### 7.3 Map type — content list

Free/no‑cost tile providers to offer, researched this round (current as of Sep 2026):

| Provider | Style(s) relevant here | Auth | Notes |
|---|---|---|---|
| **OpenFreeMap** (already speced, PRD §8) | Positron (light), Bright, Liberty, Dark, 3D | None — zero API key, zero signup | Donation‑funded public instance, no rate limit |
| **Maptoolkit.org** | Summer, Winter, Street, Light, Dark, Hiking, Cycling (+ `-3d` relief variants) | None for qualifying free use (personal/hobby/OSS/education, or small commercial: <€1M revenue and <10 employees) | Also ships **MapMaker**, a free browser‑based style editor — this is the practical path to a genuinely custom style (see "medieval" below) |
| **CARTO basemaps** | Positron (light mono), Dark Matter (dark mono), Voyager | None | Widely used, stable, good monochrome pair (`basemaps.cartocdn.com`) |
| **Stadia Maps** (now hosts Stamen's styles) | **Toner** (classic high‑contrast black‑and‑white, genuinely monochrome) · **Watercolor** (hand‑painted/parchment‑like texture — the closest ready‑made "fun/old‑timey" option) · Terrain | Free account + API key required (not zero‑signup like the others, but no cost at this scale) | Toner and Watercolor are exactly the "monochromatic" and "fun" styles you described |

**On a literal "medieval‑style" map**: there's no off‑the‑shelf free medieval/fantasy basemap provider. The two realistic paths are (a) treat Stadia's **Watercolor** style as "close enough" for a fun/old‑map feel with zero extra build work, or (b) use **Maptoolkit's MapMaker** to design an actual custom parchment/medieval‑ish style (their own marketing literally cites "an old parchment map" and "an Elden Ring‑inspired fantasy style" as things people build with it) and self‑host the resulting style JSON under their free license — more effort, but gets the specific aesthetic you're describing rather than an approximation. Recommend starting with Watercolor for v1 and treating a bespoke medieval style as a fast‑follow once the core styles are shipped.

### 7.4 Font style — Google Fonts

Confirmed direction: pull from the **Google Fonts API** rather than a small fixed list, so the picker is a real, searchable font selection rather than 5–6 hardcoded options. Implementation notes:
- Fetch the family list from Google Fonts' Developer API (needs a free API key), or ship a periodically‑refreshed static JSON of family names to avoid a live API call on every page load.
- Load only the selected family on demand (dynamically inject a `<link>`/`@font-face`, or use a loader like `webfontloader`) rather than bundling the whole catalog — there are 1,500+ families.
- Restrict to a curated subset if the full catalog feels overwhelming in a dropdown (e.g., limit to families with a Latin subset by default), but the underlying mechanism is "any Google Font," not a fixed list.

### 7.5 Font size — resolved

**8–48px in 4px steps**: 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48 — 11 options in the `Select`.

### 7.6 File Format — resolved, with one flag

**PNG and JPG only** for v1. **Worth double‑checking**: PRD §7 explicitly called PDF "decided" as a per‑image export format (distinct from the batch‑zip question) — this answer drops it. If that's a deliberate simplification, no action needed; if PDF just got missed in this pass, let me know and I'll fold it back in.

### 7.7 No‑map export — resolved

"No‑map" is confirmed as a real, selectable option in the **Map type** dropdown (not just a fallback). And the JPG‑transparency question from earlier is resolved: since JPG has no alpha channel, a no‑map canvas exported as JPG simply renders on a **plain white background** — no custom fill‑color picker needed. PNG presumably keeps true transparency for the no‑map style; confirm that's still correct.

### 7.8 File‑chip errors — resolved

All error cases share **one visual treatment** (the `Attachment` component's Error state, §3.5) — only the description text changes per case:

| Case | Suggested copy (not yet confirmed — flagging as still a copy decision) |
|---|---|
| File too large | "File is too big, max limit is 20MB" — **already exact, from Figma** |
| Unsupported file type | e.g. "Unsupported file type — we only support .gpx files right now" |
| Failed to parse (uploaded fine, not valid GPX) | e.g. "Couldn't read this file" |

**One case doesn't fit this per‑file model**: "too many files at once" (PRD §9's 50‑file cap) isn't really an error *about one specific file* — it's a whole‑batch condition. Recommend that one surface as a separate, page‑level message (e.g. a banner/toast above the dropzone) rather than trying to force it into a single `Attachment` chip, and flagging that as a small addition to the component set rather than assuming the existing Error state covers it.

---

## 8. Figma‑file QA flags (cumulative)

1. `border` and `slate/200` hold the identical value (`#E2E8F0`) — confirm intended alias relationship.
2. `slate/400` (`#94A3B8`) still unused in every fetched node.
3. ~~Two implementations of the same `ToggledSection` background~~ — **resolved**: the canonical off‑state background is `rgba(226,232,240,0.25)`; the "Show elevation profile" instance's flat `#F8F9FB` is a one‑off deviation from its own component, not a second valid pattern (§3.2). Also found while confirming this: a copy inconsistency between on/off preset labels ("5 km" vs "5km").
4. Editor header buttons use hardcoded hex instead of the `primary` variable.
5. Four near‑duplicate shadow values instead of a clean two‑step scale (§2.3).
6. `icon/default` (`#18272F`) vs `text` (`#0F172A`) — confirm this is a deliberate distinct token.
7. **New**: `SidePanel`'s own default padding (`8px`) doesn't match the value actually used in the Editor frame (`24px`).
8. **New**: the "Continue to Editor" button and the Editor's header buttons appear to be two unrelated button components rather than variants of one, and only the former has hover/pressed states defined at all (§3.6).

---

## 9. Accessibility

Contrast, computed from confirmed hex values:

| Pair | Ratio | Passes |
|---|---|---|
| `text` on white | 17.85:1 | AAA everywhere |
| `text-secondary` on white | 3.26:1 | **Fails AA** for normal text (used at 14px — right where it fails); passes large/bold only |
| White on `primary` | 8.16:1 | AAA |
| `primary-hover` on white | 5.09:1 | AA normal text |
| `error` on white | 4.83:1 | AA normal text (just clears it at the 12px size it's used at) |

Additional notes:
- Error and Uploading states must not rely on color alone — both already pair color with a distinct status *word* ("Error", "Uploading"), which is good; keep that pairing in the built component rather than dropping the label and keeping only color.
- Slide‑deck cards: focusable, `Enter`/`Space` to select; the remove button needs its own tab stop + `aria-label`. Since no hover‑reveal variant is confirmed in Figma (§3.7), make sure the remove control is still keyboard‑reachable for unselected cards by some means, even if visually hidden until focus/hover.
- `aria-current="true"` on the selected slide‑deck card, since selection is currently signaled visually (border/background/number color/weight) rather than with an explicit ARIA state.
- File‑chip removal, upload‑progress updates, and error messages should be announced via a polite `aria-live` region — multiple files can be uploading concurrently and a screen‑reader user won't otherwise know a specific chip changed state.

---

## 10. Motion & Interaction (Framer Motion)

**Now grounded in real Figma states rather than invented from scratch for these three:**
- **Switch**: `spring` thumb (`stiffness: 500, damping: 30`) — but note it's currently a swapped static SVG per state in Figma, not an animated component; the spring is a build‑time enhancement beyond what's specced.
- **FileUpload hover/drag**: `150ms` linear border color+style transition (dashed‑gray → solid‑primary).
- **"Continue to Editor" hover**: animate the icon‑gap growth (`8px → 16px`) and border fade‑in together, `120–150ms`, rather than a hard cut — this is a real, specified state change, not a guess.

**Everything else, unchanged**:
- Micro‑interactions `120–150ms`, layout transitions `200–300ms` ease‑out / `~180ms` ease‑in. Respect `prefers-reduced-motion`.
- All other `Button`s: `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.97 }}` (still the best guess for the Editor header buttons and the "Continue to Editor" Pressed state, since Figma doesn't define bespoke versions).
- Card/chip removal: `AnimatePresence` `exit={{ opacity: 0, height: 0 }}`.
- Slide‑deck selection: `layoutId`‑shared animation for the border/background move between cards.
- Homepage → Editor: opacity‑only crossfade, full route change.
- Export buttons: label → spinner → checkmark crossfade within fixed bounds.
- Never animate live stat text or the canvas mid‑export.

---

## 11. Open Questions

1. **Scope selector** — needs your answer to the clarification in §7.0: is a live "apply to all while editing" toggle still wanted, or is export‑time‑only scope the whole story — and if so, does "Export all" use each file's own settings or copy the selected file's settings onto everything? Still the single most consequential open item in this doc.
2. **True default map style**: still open — does the Editor default to a real map style or "no‑map"?
3. **"File name" heading editability** — still open.
4. **Pressed button state**: Figma's `Button` component doesn't visually differentiate Pressed from Default. Confirm whether that's intentional (rely on the app's own tap‑scale motion) or a variant that still needs designing.
5. **FilePreview hover**: no hover variant exists for unselected slide‑deck cards. Decide: add one in Figma, or ship without a hover‑reveal remove affordance.
6. **SidePanel padding**: `8px` (component default) vs. `24px` (instance override) — which is correct going forward?
7. **One Button system or two?**: the marketing‑style "Continue to Editor" button and the utilitarian Editor header buttons look like separate components today (§3.6/§8.8) — worth deciding if they should be unified.
8. **PDF export**: §7.6 answered File Format as PNG/JPG only, which drops PDF despite the PRD calling it "decided" as a per‑image format — confirm this is an intentional simplification.
9. **Error copy**: the "unsupported file type" and "failed to parse" messages in §7.8 are placeholder suggestions, not confirmed copy — need final wording.
10. **"Too many files" UI**: confirmed this doesn't fit the per‑file `Attachment` Error state (§7.8) — needs a small addition (likely a page‑level banner/toast) that doesn't exist as a component yet.
11. **Medieval map style**: Watercolor (ready‑made, zero extra build) vs. a custom MapMaker style (bespoke, more effort) — greenlight one for v1, or defer entirely to a fast‑follow (§7.3).
12. **Mobile**: still no mobile frames of any kind.
