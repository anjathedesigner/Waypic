import { computeStats, withDistances } from "./geo";
import type { TrackPoint } from "../types";

function attr(el: Element, name: string) {
  return el.getAttribute(name);
}

function childText(el: Element, tag: string) {
  const n = el.getElementsByTagName(tag)[0];
  return n?.textContent?.trim() ?? "";
}

export function parseGpx(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Couldn't read this file");
  }

  const name =
    childText(doc.documentElement, "name") ||
    doc.querySelector("trk > name")?.textContent?.trim() ||
    undefined;

  const nodes = [
    ...doc.getElementsByTagName("trkpt"),
    ...doc.getElementsByTagName("rtept"),
  ];

  const raw: Omit<TrackPoint, "dist">[] = [];
  for (const n of nodes) {
    const lat = Number(attr(n, "lat"));
    const lon = Number(attr(n, "lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const eleRaw = childText(n, "ele");
    const timeRaw = childText(n, "time");
    raw.push({
      lat,
      lon,
      ele: eleRaw ? Number(eleRaw) : undefined,
      time: timeRaw ? Date.parse(timeRaw) : undefined,
    });
  }

  if (raw.length < 2) {
    throw new Error("Couldn't read this file");
  }

  const points = withDistances(raw);
  return { name, points, stats: computeStats(points) };
}
