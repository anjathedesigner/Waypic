import { toJpeg, toPng } from "html-to-image";
import JSZip from "jszip";
import type { FileFormat, Resolution, Aspect } from "../types";
import { ASPECTS } from "../types";
import { fontEmbedCSS } from "./fonts";

export function exportPixelSize(aspect: Aspect, resolution: Resolution) {
  const { w, h } = ASPECTS[aspect];
  const long = resolution === "high" ? 2160 : resolution === "social" ? 1080 : 1440;
  const ratio = w / h;
  if (ratio >= 1) return { width: long, height: Math.round(long / ratio) };
  return { width: Math.round(long * ratio), height: long };
}

export function exportCaptureRatio(resolution: Resolution, cssW: number, cssH: number) {
  const cssLong = Math.max(cssW, cssH, 1);
  const target = resolution === "high" ? 2160 : resolution === "social" ? 1080 : 1440;
  return Math.min(Math.max(2, target / cssLong), 4096 / cssLong);
}

export async function nodeToBlob(
  node: HTMLElement,
  format: FileFormat,
  pixelRatio: number,
  fontFamily: string,
) {
  const opts = {
    pixelRatio,
    skipAutoScale: true,
    cacheBust: true,
    fontEmbedCSS: await fontEmbedCSS(fontFamily),
    backgroundColor: format === "jpg" ? "#ffffff" : undefined,
  };
  const dataUrl =
    format === "jpg" ? await toJpeg(node, { ...opts, quality: 0.96 }) : await toPng(node, opts);
  const res = await fetch(dataUrl);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function zipBlobs(files: { name: string; blob: Blob }[]) {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  return zip.generateAsync({ type: "blob" });
}

export function safeFilename(name: string) {
  return name.replace(/[^\w.-]+/g, "_").replace(/\.gpx$/i, "") || "route";
}
