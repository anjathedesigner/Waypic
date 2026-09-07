# PRD: GPS Route Image Exporter (working title)

## 1. Summary

A free, no-account, client-side web app that lets a user upload one or more GPS activity files (GPX, FIT, TCX, KML) and turns each into a shareable, customizable image (map + stats overlay). The user can tweak what data is shown, pick a map style, choose an aspect ratio, and export as PNG/JPG/PDF/SVG.

Two pages:
1. **Landing / Upload page** — pitch + drag-and-drop upload + static preview of output styles.
2. **Editor / Export page** — left-side "slide deck" of uploaded routes as images, floating toolbar for styling, right-side (or per-image) live preview, export controls.

Core constraint: **as much as possible runs in the browser**. No account, no database, no user file storage on a server. Ideally zero custom backend, or an extremely thin one only where the browser truly cannot do the job (see §8).

---

## 2. Goals

- Let someone go from "I have a GPX file from my hike/ride/run" to "I have a nice image for Instagram/journal/print" in under 2 minutes, with no signup.
- Support the common GPS file formats without the user needing to know the difference.
- Give enough customization to feel like a real design tool, not a toy — but keep the surface area small enough to ship as v1.
- Keep hosting cost near-zero and operational complexity near-zero (static site, maybe one lightweight edge function).
- Privacy-friendly: files are processed locally; nothing is uploaded to a server unless technically unavoidable (map tiles).

## 3. Non-goals (v1)

- No accounts, saved projects, cloud sync, or history across sessions/devices.
- No route editing (trimming, merging, drawing).
- No live GPS tracking / real-time activity recording.
- No social feed, sharing links, or hosted galleries.
- No collaborative/team features.
- No mobile native app (responsive web only).

---

## 4. Target users / use cases

- Runners/cyclists/hikers who want a nice recap image of one activity for social media.
- People who did a multi-day trip (multiple GPX files) and want a consistent set of images (e.g., one per day) to post or print.
- People assembling a scrapbook/blog post and want branded, consistent-looking route cards.

## 5. Supported input formats

| Format | Notes |
|---|---|
| `.gpx` | XML, most common, widely supported, easiest to parse in-browser |
| `.fit` | Binary Garmin format, richer data (HR, cadence, power) but needs a real parser |
| `.tcx` | XML, Garmin Training Center, similar data to FIT |
| `.kml` / `.kmz` | Common from Google Earth/Maps exports; kmz is zipped |

v1 targets **GPX only** as the must-have (covers the vast majority of exports from Strava, Komoot, and similar). **FIT support is explicitly deferred** to a later phase (binary format, needs a real parser — more effort than the XML-based formats). TCX and KML/KMZ remain "if time allows" or v1.1, same tier as FIT.

Data to extract per file (availability varies by format/device):
- Track points: lat/lng, elevation, timestamp (per point)
- Derived: total distance, total duration (elapsed + moving), elevation gain/loss, max/avg elevation
- Derived: avg/max speed or pace
- Optional (FIT/TCX only, if present): heart rate (avg/max), cadence, power, calories
- Metadata: activity name (if present in file), activity type (run/ride/hike — guess from filename or file metadata if not explicit), date/time of activity, start/end location (reverse-geocoded place name via Nominatim, called directly from the browser — see §8)

Note: the elevation-gradient coloring and route distance-marker features (§7.1, §7.2) both build directly on the raw track-point list (lat/lng, elevation, cumulative distance) already listed above — no additional data extraction is needed, just derived computation at render time.

---

## 6. Page 1 — Landing / Upload

### Purpose
Explain the product in one screen, get the user to upload files, set expectation for what they'll get.

### Elements
- Short hero: what it does, one line ("Turn your GPX/FIT files into beautiful shareable route images — free, no account, nothing leaves your browser").
- Static visual examples/preview cards showing 2–3 output styles (e.g., minimal map, map+stats card, elevation-profile card) so the user knows what they're going to get before uploading.
- Upload control:
  - Drag-and-drop zone + "Browse files" button.
  - Accepts multiple files at once (multi-select).
  - Client-side validation: file extension/mime check, max file size capped at **20 MB per file** (comfortably above real-world GPX/FIT sizes — even an extreme 24-hour, 1-second-interval GPX export lands around 8–9 MB — while still catching corrupted or pathological files before they can hang the browser tab), max file count capped at **50** — reject with inline message, not silent failure. A softer warning (not a hard block) above ~5 MB lets the user know parsing may take a few seconds, without treating a normal large file as an error.
  - Progress/parsing state per file (parsing can take a moment for large FIT files).
- On successful parse of at least one file → route to Page 2 (Editor) with parsed data passed via in-memory app state (no page reload, likely a client-side route change / SPA navigation, or if server-rendered pages, pass via `sessionStorage`/in-memory store, not a server round trip).
- Empty state: nothing uploaded yet — just the upload zone + examples (this is effectively the default state, so "empty state" = default state; no special handling needed beyond good copy).
- Error states (see §9).

---

## 7. Page 2 — Editor / Export

### Layout
- **Left panel**: vertical "slide deck" — one card/thumbnail per uploaded file, each showing a live-rendered preview of that route's image (map + whatever overlays are currently toggled on). Whether this is a true slide-deck (one big active image + thumbnails to switch) or a scrollable stack of full-size cards is left as a UI/visual design decision rather than a fixed product requirement, same as toolbar position above.
- **Main canvas**: larger rendering of the selected image, this is what actually gets exported.
- **Floating toolbar**: the styling controls. Exact position (top vs. bottom) is left as a UI/visual design decision rather than a fixed product requirement — either works functionally, so this gets settled during the design pass rather than blocking the spec.

### Toolbar controls
- **Scope selector**: "Apply to: this image / all images" — lets user toggle whether a change (e.g., turning on elevation profile) applies globally or just to the currently selected card. This is important since one of the core requests is per-image vs all-image control.
- **Data overlays** (toggle on/off, each independently):
  - Route line on map
  - Distance
  - Duration (elapsed/moving)
  - Elevation gain/loss
  - Elevation profile chart (mini chart overlay), with an optional **gradient/incline coloring sub-toggle** — see §7.1
  - Average pace/speed
  - Date/time
  - Activity name / title (editable text field)
  - Start/end markers
  - Place name (reverse-geocoded start/end location) — optional, off by default, "requires internet" like tile-based map styles; see §8
  - Distance markers along the route on the map (e.g., 5/10/15/25 km ticks) — optional, see §7.2
  - Heart rate / cadence / power (only shown as available if source file has them)
- **Map style dropdown**: visual picker (thumbnail previews) of a few base map styles — no-map (route on plain background, default), plus OpenFreeMap-backed options such as Positron (clean/light), Bright, Liberty, and Dark. See §8 for tile provider details.
- **Aspect ratio / format selector — decided**: 1:1 (square), 4:5 (portrait), 9:16 (portrait/story), 16:9 (landscape), 3:2 (landscape). This determines canvas shape, not export file type.
- **Color/theme controls** (nice-to-have v1, could slip to v1.1): accent color, font, line color/weight for the route.
- **Export controls**:
  - Format: PNG, JPG, PDF, (SVG as stretch)
  - Resolution/quality selector (e.g., "Standard / High / Social media optimized sizes")
  - "Export this image" vs "Export all images" — batch export uses a **zip of individual images (decided)**. A combined multi-page PDF for batch export is not in v1 scope; PDF remains available as a per-image export format.
  - **No watermark — decided.** Exports are fully unbranded; no credit/logo is added to output images.

### 7.1 Feature detail: Elevation profile with gradient coloring

Off by default (elevation profile itself is a toggle; gradient coloring is a sub-toggle only available/visible once the elevation profile is on).

- **Computation**: for each segment between consecutive (or smoothed/binned) track points, compute grade = (elevation change / horizontal distance) × 100, giving a % incline (positive = climbing, negative = descending). Raw point-to-point data is noisy, so segments should be smoothed/binned (e.g., every ~50–100m or every N points) before computing grade, otherwise the coloring will look jittery/wrong even on a smooth climb.
- **Coloring — decided**: each segment of the elevation profile (and optionally the route line on the map itself, as a nice-to-have extension of the same feature) is colored on a gradient scale by steepness, e.g.:
  - Flat / easy (~0–3%): green
  - Moderate (~3–6%): yellow
  - Hard (~6–10%): orange
  - Very hard (10%+): red
  - Descents: neutral/de-emphasized color (not part of the steepness scale), since "how hard" refers to climbing.
- A universal color/threshold scale ships in v1 (not per-activity-type); per-activity-type scales (since 6% is brutal on a bike but unremarkable on foot) are a possible later refinement, not a v1 requirement.
- **Coloring is itself optional**: alongside the gradient-by-steepness mode, the user can instead choose to render the whole route/profile in a single flat color of their choice — gradient coloring is one display mode, not mandatory whenever the elevation profile is shown.
- Display: this is a horizontal profile chart (distance on x-axis, elevation on y-axis) with the fill/line segments colored per the buckets above (or the single chosen color), plus a small legend when gradient mode is active.

### 7.2 Feature detail: Distance markers along the route

Off by default. When enabled, places labeled tick marks along the drawn route on the map at a chosen interval.

- **Interval options**: a dropdown/stepper for interval (e.g., every 1 / 5 / 10 / 25 km). Units — decided: a global km/mi default (e.g., inferred from browser locale) applies across distance/pace stats everywhere in the toolbar, with an easily accessible toggle for the user to override it at any time.
- **Computation**: walk the cumulative distance along the track points and drop a marker at each interval multiple (5, 10, 15, 20, 25...), interpolating the exact lat/lng between the two nearest track points for marker placement accuracy.
- **Display**: small dot/tick + label (e.g., "10K") along the route line on the map. Needs collision handling at small image sizes/zoomed-out views (e.g., auto-hide or auto-thin markers if the route is short relative to the interval, or if markers would visually overlap).
- Applies per-image or all-images, same as other overlays, via the scope selector.

### States
- Loading/parsing state per card while a file is still being processed.
- Error state per card if a specific file failed to parse (see §9) — shouldn't block the other successfully-parsed files from being usable.
- Empty state: not really reachable on this page since you only arrive here after a successful upload; but handle "user removed all cards" by routing back to Page 1 or showing the upload zone again.

---

## 8. Technical architecture

### Guiding principle
Push everything possible into the browser: file parsing, image compositing, and export. The one piece that's genuinely hard to do 100% client-side is **map tiles** — resolved below by using OpenFreeMap, which keeps this fully serverless without you needing to run any tile infrastructure.

### Frontend (does almost everything)
- **Framework**: any lightweight SPA setup works (React/Vite, SvelteKit, or even vanilla JS + a bundler) — pick whatever you're fastest in. Given "as light as possible," a small React+Vite app or Svelte app statically exported/hosted is a good fit. No SSR needed.
- **File parsing** (all client-side, in-browser JS/WASM, no upload to a server, run inside a Web Worker to keep the UI responsive even on larger files near the 20MB cap):
  - GPX: parse as XML directly (it's just XML) — a small custom parser or a lightweight library.
  - FIT: needs a proper binary parser — there are JS libraries for this; this is the trickiest piece to get right and worth budgeting real time for (deferred past v1, see §5).
  - TCX/KML: XML-based, same approach as GPX; KMZ needs unzip first (in-browser zip lib).
- **Map rendering**: use a JS mapping library (e.g., a Leaflet/MapLibre GL–style library) to draw the route + base map into the canvas that will become the exported image.
- **Map tiles (the one external dependency) — decided: OpenFreeMap**. Tile-based styles will pull from [OpenFreeMap](https://openfreemap.org)'s public instance via MapLibre GL JS. Rationale: it's free with no API key, no registration, and no usage limits on its public instance; it's OSM-derived data (which tends to be strong on trails/cycling infrastructure, a good fit for this app); it ships several ready-made styles out of the box (Positron, Bright, Liberty, Dark, 3D) covering the "map style dropdown" requirement without building styles from scratch; and it's MIT-licensed and self-hostable, so there's a fallback path if the public instance ever becomes unavailable. Caveats to design around: it's a donation-funded, single-maintainer project with no formal SLA (acceptable for a free tool, but worth knowing); it has no satellite/aerial imagery (vector line-map styles only); and a small attribution line ("OpenFreeMap © OpenMapTiles, Data from OpenStreetMap") is required — MapLibre adds this automatically, so no extra work needed.
- The **no-tile / minimalist style** (route drawn on a plain/generated background, zero external requests) remains the default/hero style regardless of tile provider, since it's what keeps the app fully serverless for users who never touch a tile-based style. OpenFreeMap-backed styles are offered as clearly-labeled "requires internet" options alongside it.
- **Image export**: render the composited card (map/background + overlays) to an off-screen canvas and export via canvas → PNG/JPEG; for PDF, generate client-side using a small PDF-generation library that takes canvas/image output as input; batch export can zip multiple images client-side.
- **State management**: everything (parsed route data, per-image style settings) lives in memory / component state for the session. Nothing needs to persist across reloads for v1 (no accounts = no need to save state server-side; could optionally use browser storage like IndexedDB later purely as a "don't lose my work on refresh" convenience, not a product requirement).

### Backend
- **Ideal v1: none.** Fully static site (HTML/CSS/JS bundle) hosted on any static host (Netlify, Vercel static, Cloudflare Pages, GitHub Pages, S3+CDN, or directly on your existing website's static hosting).
- **If a tiny backend becomes necessary**, the main realistic reason is:
  - Proxying/caching map tile requests if the free tile provider requires it or you want to hide an API key. Even this can often be avoided by using a provider with browser-safe public tokens (as with OpenFreeMap above).
  - If this is needed, a single small serverless/edge function (not a persistent server) is enough — no database, no auth, stateless request-in/response-out.
- **Reverse geocoding does not require a backend after all.** OpenStreetMap's Nominatim reverse-geocoding service is callable directly from the browser via a plain fetch — no API key, and it's explicitly designed to support both server and in-browser callers. The real constraints are usage-policy ones, not architectural: identify the app (Nominatim accepts the browser's automatic Referer header for this), don't do bulk/systematic lookups, and cache results rather than re-querying. Since this app only needs one or two lookups per uploaded file (start/end point, at export time — not continuous), and each end user's own browser makes the call from their own IP rather than pooling through your server, usage stays naturally within policy. Recommendation: include it in v1 as an optional overlay ("place name"), off by default like the tile-based map styles, with the same "requires internet" labeling and a graceful no-op fallback if a lookup fails or is rate-limited.
- **No server-side file storage, no database, no user auth** — nothing about this product requires persistence beyond the current browser session.

### Hosting
- Static hosting only (v1). Whatever you already use for your website is almost certainly sufficient (this is just static assets + client-side JS).

---

## 9. Error & empty states (checklist)

- Upload page:
  - Unsupported file type selected → inline error, name the supported types, don't block other valid files in the same batch.
  - File too large → inline error with the size limit stated.
  - Too many files at once → inline error with the cap stated.
  - File fails to parse (corrupt/empty/unexpected format inside) → inline error per file, rest of batch continues.
  - No files uploaded yet → default/empty state, just upload zone + examples (not a true "error").
- Editor page:
  - A specific card's file failed to parse → show an error state on that card (with a "remove" option) rather than blocking the whole session.
  - Route has no elevation data → elevation-related toggles disabled/greyed with a tooltip explaining why, rather than showing broken/zeroed charts.
  - Route has no timestamps → duration/pace-related toggles disabled similarly.
  - Map tile style selected but network/tile request fails → fall back to the no-tile style automatically, with a small notice.
  - Export fails (e.g., canvas too large for browser memory at very high resolution) → clear error message, suggest lowering resolution or exporting fewer images at once.
  - All cards removed → return to (or re-show) the upload state.

---

## 10. Success metrics (informal, since there's no account/analytics-heavy system)

- % of visitors who upload a file.
- % of uploaders who complete an export.
- Time from upload to first export.
- Basic aggregate/anonymous analytics only (page views, conversion funnel) — no personal data tied to identity, consistent with the no-account/privacy-friendly positioning.

---

## 11. Open questions / decisions to make before building

None remaining — all product-level decisions from earlier drafts are now resolved and reflected in the sections above. Any further open items (exact library choices, precise UI layout details) are implementation-level and can be worked out during build.

---

## 12. Suggested build phases

**Phase 1 — Core loop, GPX only, no-tile style only**
Upload → parse GPX → render route on plain background with basic stats overlay → export PNG. Prove the end-to-end flow and export quality first.

**Phase 2 — Add styling depth**
Aspect ratios, overlay toggles (all the stat types, including reverse-geocoded place name), per-image vs all-image scope, map style dropdown with 1 real tile-based option added.

**Phase 3 — Format breadth + export breadth**
Add FIT parsing, add JPG/PDF export, add batch export.

**Phase 4 — Polish**
TCX/KML support if desired, additional map styles, theming/color controls, refined empty/error states, performance tuning for large files.
