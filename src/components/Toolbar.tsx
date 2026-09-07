import { Switch } from "./ui/Switch";
import { Select } from "./ui/Select";
import { Segmented } from "./ui/Segmented";
import { Slider } from "./ui/Slider";
import { ensureFont } from "../lib/fonts";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  MAP_STYLES,
  type Aspect,
  type ColorMode,
  type FileFormat,
  type MapStyleId,
  type Resolution,
  type RouteFile,
  type StyleSettings,
  type Units,
} from "../types";

export function Toolbar({
  file,
  onChange,
  scopeNote,
}: {
  file: RouteFile;
  onChange: (patch: Partial<StyleSettings>) => void;
  scopeNote?: string;
}) {
  const s = file.style;
  const noTime = !file.stats.hasTime;
  const noEle = !file.stats.hasElevation;

  return (
    <aside className="toolbar">
      {scopeNote ? <div className="toolbar-scope">{scopeNote}</div> : null}
      <div className="toolbar-label">Map</div>
      <Select
        aria-label="Map style"
        value={s.mapStyle}
        onChange={(v: MapStyleId) => onChange({ mapStyle: v })}
        options={MAP_STYLES.map((m) => ({
          value: m.id,
          label: m.label,
        }))}
      />
      <div className="toolbar-row">
        <span>Format</span>
        <Segmented
          grow
          value={s.aspect}
          onChange={(v: Aspect) => onChange({ aspect: v })}
          options={(["1:1", "4:5", "9:16", "3:2"] as Aspect[]).map((a) => ({
            value: a,
            label: a,
          }))}
        />
      </div>

      <div className="rule" />
      <div className="toolbar-label">Route</div>
      <div className="toolbar-row">
        <span>Units</span>
        <Segmented
          value={s.units}
          onChange={(v: Units) => onChange({ units: v })}
          options={[
            { value: "metric", label: "km/m" },
            { value: "imperial", label: "mi/ft" },
          ]}
        />
      </div>

      <div className={`toggle-section ${s.showDistanceMarkers ? "is-on" : ""}`}>
        <div className="toggle-row">
          <span>Show Distance Markers</span>
          <Switch
            label="Show Distance Markers"
            checked={s.showDistanceMarkers}
            onChange={(v) => onChange({ showDistanceMarkers: v })}
          />
        </div>
        <Segmented
          grow
          disabled={!s.showDistanceMarkers}
          value={String(s.markerIntervalKm)}
          onChange={(v) => onChange({ markerIntervalKm: Number(v) as 1 | 5 | 10 | 20 })}
          options={[
            { value: "1", label: s.units === "imperial" ? "1 mi" : "1 km" },
            { value: "5", label: s.units === "imperial" ? "3 mi" : "5 km" },
            { value: "10", label: s.units === "imperial" ? "6 mi" : "10 km" },
            { value: "20", label: s.units === "imperial" ? "12 mi" : "20 km" },
          ]}
        />
      </div>

      <Slider
        label="Path Weight"
        min={2}
        max={16}
        value={s.pathWeight}
        onChange={(v) => onChange({ pathWeight: v })}
      />

      <div className="toolbar-row">
        <span>Route Colour</span>
        <ColorModePair
          color={s.routeColor}
          mode={s.routeColorMode}
          gradientDisabled={noEle}
          onColor={(routeColor) => onChange({ routeColor, routeColorMode: "solid", elevationColor: routeColor, elevationColorMode: "solid" })}
          onMode={(routeColorMode) => {
            if (routeColorMode === "gradient" && noEle) return;
            onChange({ routeColorMode });
          }}
        />
      </div>

      <div className="rule" />
      <div className="toolbar-label">Typography</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <Select
          aria-label="Font Style"
          previewFonts
          value={s.fontFamily}
          onChange={(v) => {
            onChange({ fontFamily: v });
            void ensureFont(v);
          }}
          options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
        />
        <Select
          aria-label="Font Size"
          value={String(s.fontSize)}
          onChange={(v) => onChange({ fontSize: Number(v) })}
          options={FONT_SIZES.map((n) => ({ value: String(n), label: `${n}px` }))}
        />
      </div>

      <div className="rule" />
      <div className="toolbar-label">Statistics</div>
      <Toggle
        label="Show Overlay"
        checked={s.showStatsOverlay}
        onChange={(v) => onChange({ showStatsOverlay: v })}
      />
      <Toggle label="Show Distance" checked={s.showDistance} onChange={(v) => onChange({ showDistance: v })} />
      <Toggle
        label="Show Duration"
        checked={s.showDuration}
        onChange={(v) => onChange({ showDuration: v })}
        disabled={noTime}
      />
      <Toggle
        label="Show Pace"
        checked={s.showPace}
        onChange={(v) => onChange({ showPace: v })}
        disabled={noTime}
      />
      <Toggle
        label="Show Elevation"
        checked={s.showElevation}
        onChange={(v) => onChange({ showElevation: v })}
        disabled={noEle}
      />

      <div className={`toggle-section ${s.showElevationProfile ? "is-on" : ""}`}>
        <div className="toggle-row">
          <span>Show Elevation Profile</span>
          <Switch
            label="Show Elevation Profile"
            checked={s.showElevationProfile}
            onChange={(v) => onChange({ showElevationProfile: v })}
            disabled={noEle}
          />
        </div>
        <ColorModePair
          color={s.elevationColor}
          mode={s.elevationColorMode}
          disabled={!s.showElevationProfile || noEle}
          onColor={(elevationColor) => onChange({ elevationColor, elevationColorMode: "solid" })}
          onMode={(elevationColorMode) => onChange({ elevationColorMode })}
        />
      </div>

      <div className="rule" />
      <div className="toolbar-label">Export</div>
      <Select
        aria-label="Resolution"
        value={s.resolution}
        onChange={(v: Resolution) => onChange({ resolution: v })}
        options={[
          { value: "standard", label: "Standard" },
          { value: "high", label: "High" },
          { value: "social", label: "Social" },
        ]}
      />
      <Select
        aria-label="File format"
        value={s.format}
        onChange={(v: FileFormat) => onChange({ format: v })}
        options={[
          { value: "png", label: "PNG" },
          { value: "jpg", label: "JPG" },
        ]}
      />
    </aside>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="toggle-row">
      <span style={{ opacity: disabled ? 0.45 : 1 }}>{label}</span>
      <Switch label={label} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function ColorModePair({
  color,
  mode,
  onColor,
  onMode,
  disabled,
  gradientDisabled,
}: {
  color: string;
  mode: ColorMode;
  onColor: (c: string) => void;
  onMode: (m: ColorMode) => void;
  disabled?: boolean;
  gradientDisabled?: boolean;
}) {
  const noGradient = Boolean(disabled || gradientDisabled);
  const gradientOn = mode === "gradient" && !noGradient;
  return (
    <div className="seg seg-grow">
      <label className={`hex-field ${!gradientOn && !disabled ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}>
        <span className="hex-swatch" style={{ background: color }}>
          <input
            type="color"
            value={color}
            disabled={disabled}
            aria-label="Solid colour"
            onChange={(e) => onColor(e.target.value)}
            onClick={() => onMode("solid")}
          />
        </span>
        <input
          type="text"
          value={color}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#([0-9a-fA-F]{0,6})$/.test(v)) onColor(v);
          }}
          onFocus={() => onMode("solid")}
        />
      </label>
      <button
        type="button"
        disabled={noGradient}
        title={gradientDisabled && !disabled ? "This file has no elevation data" : undefined}
        className={`seg-btn ${gradientOn ? "is-selected" : ""} ${noGradient ? "is-disabled" : ""}`}
        onClick={() => onMode("gradient")}
      >
        Gradient
      </button>
    </div>
  );
}
