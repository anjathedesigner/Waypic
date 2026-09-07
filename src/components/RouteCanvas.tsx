import { useEffect, useLayoutEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef, type Ref } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  interpolateAtDistance,
  markerIntervalM,
  projectPoints,
  segmentColors,
} from "../lib/geo";
import { ensureFont, fontStack } from "../lib/fonts";
import { MAP_STYLES, type RouteFile, type TrackPoint } from "../types";

const BLANK_MAP_STYLE = {
  version: 8 as const,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#ffffff" },
    },
  ],
};

export type RouteCanvasHandle = {
  settleForExport: (pixelRatio: number) => Promise<void>;
  restoreAfterExport: () => void;
};

export const RouteCanvas = forwardRef<RouteCanvasHandle, {
  file: RouteFile;
  width: number;
  height: number;
  showMap?: boolean;
  preview?: boolean;
  canvasRef?: Ref<HTMLDivElement>;
}>(function RouteCanvas({
  file,
  width,
  height,
  showMap,
  preview,
  canvasRef,
}, ref) {
  const { style, points, stats, heading } = file;
  const overlayEl = useRef<HTMLDivElement>(null);
  const [overlayH, setOverlayH] = useState(0);
  const viewPad = useMemo(
    () => routeViewPad(width, height, overlayH, style.pathWeight),
    [width, height, overlayH, style.pathWeight],
  );
  const projected = useMemo(
    () => projectPoints(points, width, height, viewPad),
    [points, width, height, viewPad],
  );
  const segs = useMemo(
    () => (style.routeColorMode === "gradient" && stats.hasElevation ? segmentColors(points) : []),
    [points, style.routeColorMode, stats.hasElevation],
  );
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapPixelRatioRef = useRef<number | null>(null);
  const viewRef = useRef({ width, height, points, file, viewPad });
  viewRef.current = { width, height, points, file, viewPad };
  const [mapReady, setMapReady] = useState(false);

  useImperativeHandle(ref, () => ({
    async settleForExport(pixelRatio: number) {
      const map = mapRef.current;
      if (!map) {
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return;
      }
      mapPixelRatioRef.current = map.getPixelRatio();
      map.setPixelRatio(pixelRatio);
      map.resize();
      await waitMapIdle(map);
    },
    restoreAfterExport() {
      const map = mapRef.current;
      const prev = mapPixelRatioRef.current;
      if (!map || prev == null) return;
      map.setPixelRatio(prev);
      map.resize();
      mapPixelRatioRef.current = null;
    },
  }));
  const styleUrl = MAP_STYLES.find((s) => s.id === style.mapStyle)?.url ?? null;
  const blankMap = style.mapStyle === "none";
  const useMap = Boolean(showMap && points.length >= 2 && (styleUrl || blankMap));

  useEffect(() => {
    if (!useMap) {
      setMapReady(false);
      return;
    }
    let cancelled = false;
    let map: MapLibreMap | undefined;

    void (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !mapEl.current) return;
        map = new maplibre.Map({
          container: mapEl.current,
          style: styleUrl ?? BLANK_MAP_STYLE,
          attributionControl: preview || blankMap ? false : { compact: true },
          interactive: false,
          canvasContextAttributes: { preserveDrawingBuffer: true },
        });
        mapRef.current = map;
        map.on("load", () => {
          if (!map || cancelled) return;
          const view = viewRef.current;
          paintRoute(map, view.points, view.file);
          fitMapToRoute(map, view.points, view.viewPad);
          setMapReady(true);
        });
        map.on("error", () => {
          if (!cancelled) setMapReady(false);
        });
      } catch {
        if (!cancelled) setMapReady(false);
      }
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      map?.remove();
      mapRef.current = null;
    };
  }, [useMap, styleUrl, blankMap, file.id, preview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => paintRoute(map, viewRef.current.points, viewRef.current.file);
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [file, points, style.pathWeight, style.routeColor, style.routeColorMode, style.showDistanceMarkers, style.markerIntervalKm, style.units]);

  useLayoutEffect(() => {
    const el = overlayEl.current;
    if (!el) return;
    const sync = () => {
      const next = Math.ceil(el.getBoundingClientRect().height);
      setOverlayH((h) => (h === next ? h : next));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [heading, style.fontSize, style.showDistance, style.showDuration, style.showPace, style.showElevation, style.showElevationProfile, style.showStatsOverlay, width]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const run = () => fitMapToRoute(map, points, viewPad);
    run();
    const frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [width, height, points, useMap, viewPad]);

  const markers = useMemo(() => {
    if (!style.showDistanceMarkers || (useMap && mapReady)) return [];
    return markerPoints(points, stats.distanceM, style.markerIntervalKm, style.units, style.pathWeight).flatMap((m) => {
      const proj = projectPoints([points[0], m.pt, points.at(-1)!], width, height, viewPad);
      const mid = proj[1];
      return mid ? [{ x: mid.x, y: mid.y, label: m.label, offx: m.offx, offy: m.offy }] : [];
    });
  }, [style, stats.distanceM, points, width, height, useMap, mapReady, viewPad]);

  const pathD = projected.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  useEffect(() => {
    void ensureFont(style.fontFamily);
  }, [style.fontFamily]);

  const darkMap = style.mapStyle === "dark" || style.mapStyle === "fiord";
  const overlayStyle = {
    fontFamily: fontStack(style.fontFamily),
    fontSize: `${style.fontSize}px`,
    lineHeight: 1.25,
    color: darkMap ? "#fff" : "var(--foreground)",
    ...(style.showStatsOverlay
      ? {
          backgroundColor: darkMap ? "rgb(15 23 42 / 60%)" : "rgb(255 255 255 / 60%)",
        }
      : null),
  };

  return (
    <div
      ref={canvasRef}
      className={`route-card ${style.mapStyle === "none" ? "is-nomap" : ""} ${style.format === "jpg" ? "is-jpg" : ""} ${preview ? "is-preview" : ""} ${darkMap ? "is-dark-map" : ""}`}
      style={{ width, height }}
    >
      {useMap ? <div ref={mapEl} className="route-map" /> : null}
      {!useMap || !mapReady ? (
        <svg className="route-svg" width={width} height={height} aria-hidden>
          {style.routeColorMode === "gradient" && segs.length
            ? segs.map((s, i) => {
                const slice = projected.slice(s.from, s.to + 1);
                const d = slice
                  .map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                  .join(" ");
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={style.pathWeight}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })
            : (
              <path
                d={pathD}
                fill="none"
                stroke={style.routeColor}
                strokeWidth={style.pathWeight}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          {markers.map((m) => (
            <g key={`${m.x}-${m.y}-${m.label}`}>
              <circle cx={m.x} cy={m.y} r={4} fill={darkMap ? "#fff" : "var(--foreground)"} />
              <text x={m.x + m.offx * 11} y={m.y + m.offy * 11} fontSize={11} textAnchor="middle" dominantBaseline="middle" fill={darkMap ? "#fff" : "var(--foreground)"}>
                {m.label}
              </text>
            </g>
          ))}
        </svg>
      ) : null}
      <div
        ref={overlayEl}
        className={`route-overlays ${style.showStatsOverlay ? "has-overlay" : ""}`}
        style={overlayStyle}
      >
        {heading ? (
          <div className="route-heading" style={{ fontFamily: overlayStyle.fontFamily }}>
            {heading}
          </div>
        ) : null}
        <div className="stat-row" style={{ fontFamily: overlayStyle.fontFamily }}>
          {style.showDistance ? (
            <div className="stat">
              <span>Distance</span>
              <b>{formatDistance(stats.distanceM, style.units)}</b>
            </div>
          ) : null}
          {style.showDuration && stats.durationS != null ? (
            <div className="stat">
              <span>Duration</span>
              <b>{formatDuration(stats.durationS)}</b>
            </div>
          ) : null}
          {style.showPace && stats.durationS != null ? (
            <div className="stat">
              <span>Pace</span>
              <b>{formatPace(stats.distanceM, stats.durationS, style.units)}</b>
            </div>
          ) : null}
          {style.showElevation && stats.elevationGainM != null ? (
            <div className="stat">
              <span>Elevation</span>
              <b>{formatElevation(stats.elevationGainM, style.units)}</b>
            </div>
          ) : null}
        </div>
        {style.showElevationProfile && stats.hasElevation ? (
          <ElevationSpark file={file} width={Math.max(120, width - 32)} height={56} />
        ) : null}
      </div>
    </div>
  );
});

function waitMapIdle(map: MapLibreMap, ms = 8000) {
  return new Promise<void>((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      map.off("idle", done);
      resolve();
    };
    const timer = window.setTimeout(done, ms);
    map.once("idle", done);
    map.triggerRepaint();
  });
}

function markerLabelOffset(points: TrackPoint[], d: number, pt: TrackPoint, pathWeight: number) {
  const sample = 50;
  const lastDist = points.at(-1)?.dist ?? d;
  const a = interpolateAtDistance(points, Math.max(0, d - sample)) ?? pt;
  const b = interpolateAtDistance(points, Math.min(lastDist, d + sample)) ?? pt;
  const cos = Math.cos((pt.lat * Math.PI) / 180);
  let tx = (b.lon - a.lon) * cos;
  let ty = b.lat - a.lat;
  const tlen = Math.hypot(tx, ty);
  if (tlen < 1e-12) return { offx: 1.4, offy: -1.4 };
  tx /= tlen;
  ty /= tlen;
  let east = -ty;
  let north = tx;

  const windowM = 240;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of points) {
    if (Math.abs(p.dist - d) > windowM) continue;
    sx += (p.lon - pt.lon) * cos;
    sy += p.lat - pt.lat;
    n++;
  }
  if (n > 4 && sx * east + sy * north > 0) {
    east = -east;
    north = -north;
  }

  const radial = Math.max(1.7, (pathWeight * 0.5 + 14) / 11);
  return { offx: east * radial, offy: -north * radial };
}

function markerPoints(
  points: TrackPoint[],
  total: number,
  km: number,
  units: RouteFile["style"]["units"],
  pathWeight: number,
) {
  const step = markerIntervalM(km, units);
  const out: { pt: TrackPoint; label: string; offx: number; offy: number }[] = [];
  for (let d = step; d < total; d += step) {
    const pt = interpolateAtDistance(points, d);
    if (!pt) continue;
    const label = units === "imperial" ? `${Math.round(d / 1609.344)}` : `${Math.round(d / 1000)}`;
    out.push({ pt, label, ...markerLabelOffset(points, d, pt, pathWeight) });
  }
  return out;
}

function routeBounds(points: TrackPoint[]): [[number, number], [number, number]] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

const OVERLAY_BOTTOM = 48;

function routeViewPad(width: number, height: number, overlayH: number, pathWeight: number) {
  const edge = Math.max(16, Math.round(Math.min(width, height) * 0.1));
  const gap = Math.max(12, pathWeight);
  const bottom =
    overlayH > 0 ? OVERLAY_BOTTOM + overlayH + gap : edge;
  return {
    top: edge,
    left: edge,
    right: edge,
    bottom: Math.min(Math.ceil(bottom), Math.max(edge, height - edge - 24)),
  };
}

function fitMapToRoute(
  map: MapLibreMap,
  points: TrackPoint[],
  pad: { top: number; right: number; bottom: number; left: number },
) {
  if (points.length < 2) return;
  map.resize();
  map.fitBounds(routeBounds(points), { padding: pad, animate: false, maxZoom: 16 });
}

function routeLineCollection(points: TrackPoint[], file: RouteFile) {
  const { style, stats } = file;
  const grade =
    style.routeColorMode === "gradient" && stats.hasElevation ? segmentColors(points) : [];
  const features =
    grade.length > 0
      ? grade.map((s) => ({
          type: "Feature" as const,
          properties: { color: s.color },
          geometry: {
            type: "LineString" as const,
            coordinates: points.slice(s.from, s.to + 1).map((p) => [p.lon, p.lat]),
          },
        }))
      : [
          {
            type: "Feature" as const,
            properties: { color: style.routeColor },
            geometry: {
              type: "LineString" as const,
              coordinates: points.map((p) => [p.lon, p.lat]),
            },
          },
        ];
  return { type: "FeatureCollection" as const, features };
}

function markerLabelColor(mapStyle: RouteFile["style"]["mapStyle"]) {
  return mapStyle === "dark" || mapStyle === "fiord" ? "#ffffff" : "#0f172a";
}

function paintRoute(map: MapLibreMap, points: TrackPoint[], file: RouteFile) {
  const { style, stats } = file;
  const labelColor = markerLabelColor(style.mapStyle);
  const line = routeLineCollection(points, file);
  const ticks = {
    type: "FeatureCollection" as const,
    features: style.showDistanceMarkers
      ? markerPoints(points, stats.distanceM, style.markerIntervalKm, style.units, style.pathWeight).map((m) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [m.pt.lon, m.pt.lat] },
          properties: { label: m.label, offset: [m.offx, m.offy] },
        }))
      : [],
  };

  const route = map.getSource("route") as GeoJSONSource | undefined;
  if (route) route.setData(line);
  else {
    map.addSource("route", { type: "geojson", data: line });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": style.pathWeight,
        "line-opacity": 0.95,
      },
    });
  }

  const tickSrc = map.getSource("ticks") as GeoJSONSource | undefined;
  if (tickSrc) tickSrc.setData(ticks);
  else {
    map.addSource("ticks", { type: "geojson", data: ticks });
    map.addLayer({
      id: "tick-dots",
      type: "circle",
      source: "ticks",
      paint: { "circle-radius": 4, "circle-color": labelColor, "circle-stroke-width": 0 },
    });
    map.addLayer({
      id: "tick-labels",
      type: "symbol",
      source: "ticks",
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-anchor": "center",
        "text-offset": ["get", "offset"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": labelColor },
    });
  }

  if (map.getLayer("route-line")) {
    map.setPaintProperty("route-line", "line-color", ["get", "color"]);
    map.setPaintProperty("route-line", "line-width", style.pathWeight);
  }
  if (map.getLayer("tick-dots")) {
    map.setPaintProperty("tick-dots", "circle-color", labelColor);
    map.setPaintProperty("tick-dots", "circle-radius", 4);
    map.setPaintProperty("tick-dots", "circle-stroke-width", 0);
  }
  if (map.getLayer("tick-labels")) {
    map.setPaintProperty("tick-labels", "text-color", labelColor);
    map.setLayoutProperty("tick-labels", "text-offset", ["get", "offset"]);
  }
}

function ElevationSpark({ file, width, height }: { file: RouteFile; width: number; height: number }) {
  const { points, style } = file;
  const eles = points.map((p) => p.ele).filter((e): e is number => e != null);
  if (eles.length < 2) return null;
  const min = Math.min(...eles);
  const max = Math.max(...eles);
  const span = Math.max(max - min, 1);
  const segs = style.elevationColorMode === "gradient" ? segmentColors(points) : [];
  const xAt = (i: number) => (i / (points.length - 1)) * width;
  const yAt = (ele?: number) => height - ((ele ?? min) - min) / span * (height - 4) - 2;

  if (segs.length) {
    return (
      <svg className="elev" width={width} height={height} aria-hidden>
        {segs.map((s, i) => {
          const slice = points.slice(s.from, s.to + 1);
          const d = slice
            .map((p, j) => `${j === 0 ? "M" : "L"}${xAt(s.from + j).toFixed(1)} ${yAt(p.ele).toFixed(1)}`)
            .join(" ");
          return <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />;
        })}
      </svg>
    );
  }

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(p.ele).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="elev" width={width} height={height} aria-hidden>
      <path d={d} fill="none" stroke={style.elevationColor} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
