import type { TrackPoint, RouteStats, Units } from "../types";

const EARTH_M = 6371000;

export function haversine(a: TrackPoint, b: TrackPoint) {
  const r1 = (a.lat * Math.PI) / 180;
  const r2 = (b.lat * Math.PI) / 180;
  const dLat = r2 - r1;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r1) * Math.cos(r2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function withDistances(raw: Omit<TrackPoint, "dist">[]): TrackPoint[] {
  let dist = 0;
  return raw.map((p, i) => {
    if (i > 0) dist += haversine({ ...raw[i - 1], dist: 0 }, { ...p, dist: 0 });
    return { ...p, dist };
  });
}

export function computeStats(points: TrackPoint[]): RouteStats {
  const distanceM = points.at(-1)?.dist ?? 0;
  const times = points.map((p) => p.time).filter((t): t is number => t != null);
  const hasTime = times.length >= 2;
  const durationS = hasTime ? (times.at(-1)! - times[0]!) / 1000 : null;

  const eles = points.map((p) => p.ele).filter((e): e is number => e != null);
  const hasElevation = eles.length >= 2;
  let elevationGainM: number | null = null;
  if (hasElevation) {
    let gain = 0;
    let last = eles[0];
    for (const e of eles) {
      const d = e - last;
      if (d > 0.5) gain += d;
      last = e;
    }
    elevationGainM = gain;
  }

  let movingS: number | null = null;
  if (hasTime) {
    movingS = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (a.time == null || b.time == null) continue;
      const dt = (b.time - a.time) / 1000;
      if (dt <= 0 || dt > 60) continue;
      const speed = (b.dist - a.dist) / dt;
      if (speed > 0.4) movingS += dt;
    }
  }

  return { distanceM, durationS, elevationGainM, movingS, hasElevation, hasTime };
}

export function mercatorY(lat: number) {
  const s = Math.sin((lat * Math.PI) / 180);
  return Math.log((1 + s) / (1 - s)) / 2;
}

export function mercatorX(lon: number) {
  return (lon * Math.PI) / 180;
}

export type ViewPad = number | { top: number; right: number; bottom: number; left: number };

function boxPad(pad: ViewPad) {
  if (typeof pad === "number") return { top: pad, right: pad, bottom: pad, left: pad };
  return pad;
}

export function projectPoints(
  points: TrackPoint[],
  width: number,
  height: number,
  pad: ViewPad = 36,
) {
  if (!points.length) return [];
  const inset = boxPad(pad);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    const x = mercatorX(p.lon);
    const y = mercatorY(p.lat);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const innerW = Math.max(1, width - inset.left - inset.right);
  const innerH = Math.max(1, height - inset.top - inset.bottom);
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const ox = inset.left + (innerW - spanX * scale) / 2;
  const oy = inset.bottom + (innerH - spanY * scale) / 2;
  return points.map((p) => ({
    x: ox + (mercatorX(p.lon) - minX) * scale,
    y: height - (oy + (mercatorY(p.lat) - minY) * scale),
    p,
  }));
}

export function interpolateAtDistance(points: TrackPoint[], target: number): TrackPoint | null {
  if (!points.length) return null;
  if (target <= 0) return points[0];
  if (target >= points.at(-1)!.dist) return points.at(-1)!;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.dist >= target) {
      const t = (target - a.dist) / Math.max(b.dist - a.dist, 1e-6);
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
        ele: a.ele != null && b.ele != null ? a.ele + (b.ele - a.ele) * t : a.ele,
        dist: target,
      };
    }
  }
  return points.at(-1)!;
}

export function gradeColor(gradePct: number) {
  if (gradePct < 0) return "#94A3B8";
  if (gradePct < 3) return "#22C55E";
  if (gradePct < 6) return "#EAB308";
  if (gradePct < 10) return "#F97316";
  return "#DC2626";
}

export function segmentColors(points: TrackPoint[], binM = 80) {
  const segs: { from: number; to: number; color: string }[] = [];
  if (points.length < 2) return segs;
  let start = 0;
  let dist = 0;
  let dEle = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    dist += b.dist - a.dist;
    if (a.ele != null && b.ele != null) dEle += b.ele - a.ele;
    if (dist >= binM || i === points.length - 1) {
      const grade = dist > 0 ? (dEle / dist) * 100 : 0;
      segs.push({ from: start, to: i, color: gradeColor(grade) });
      start = i;
      dist = 0;
      dEle = 0;
    }
  }
  return segs;
}

export function formatDistance(m: number, units: Units) {
  if (units === "imperial") {
    const mi = m / 1609.344;
    return mi >= 10 ? `${mi.toFixed(0)} mi` : `${mi.toFixed(2)} mi`;
  }
  const km = m / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

export function formatElevation(m: number, units: Units) {
  if (units === "imperial") return `${Math.round(m * 3.28084)} ft`;
  return `${Math.round(m)} m`;
}

export function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

export function formatPace(distanceM: number, durationS: number, units: Units) {
  if (distanceM < 10 || durationS <= 0) return "—";
  if (units === "imperial") {
    const secPerMi = durationS / (distanceM / 1609.344);
    const mm = Math.floor(secPerMi / 60);
    const ss = Math.round(secPerMi % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss} /mi`;
  }
  const secPerKm = durationS / (distanceM / 1000);
  const mm = Math.floor(secPerKm / 60);
  const ss = Math.round(secPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss} /km`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function markerIntervalM(km: number, units: Units) {
  if (units === "imperial") {
    const miles = km === 1 ? 1 : km === 5 ? 3 : km === 10 ? 6 : 12;
    return miles * 1609.344;
  }
  return km * 1000;
}
