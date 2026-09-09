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

function skipMapWebGL(node: HTMLElement) {
  return !(node instanceof HTMLCanvasElement && node.classList.contains("maplibregl-canvas"));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("export overlay failed"));
    img.src = src;
  });
}

function canvasToFormatBlob(canvas: HTMLCanvasElement, format: FileFormat) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("export encode failed"))),
      format === "jpg" ? "image/jpeg" : "image/png",
      format === "jpg" ? 0.96 : undefined,
    );
  });
}

async function overlayDataUrl(
  node: HTMLElement,
  format: FileFormat,
  pixelRatio: number,
  fontFamily: string,
  transparent: boolean,
  skipWebGL: boolean,
) {
  const opts = {
    pixelRatio,
    skipAutoScale: true,
    cacheBust: true,
    fontEmbedCSS: await fontEmbedCSS(fontFamily),
    backgroundColor: transparent || format !== "jpg" ? undefined : "#ffffff",
    filter: skipWebGL ? skipMapWebGL : undefined,
  };
  return format === "jpg" && !transparent
    ? toJpeg(node, { ...opts, quality: 0.96 })
    : toPng(node, opts);
}

export async function nodeToBlob(
  node: HTMLElement,
  format: FileFormat,
  pixelRatio: number,
  fontFamily: string,
  mapSnapshot?: HTMLCanvasElement | null,
) {
  if (!mapSnapshot) {
    const dataUrl = await overlayDataUrl(node, format, pixelRatio, fontFamily, false, false);
    return (await fetch(dataUrl)).blob();
  }

  const prevBg = node.style.background;
  node.classList.add("is-exporting");
  node.style.background = "transparent";
  let overlayUrl: string;
  try {
    overlayUrl = await overlayDataUrl(node, format, pixelRatio, fontFamily, true, true);
  } finally {
    node.classList.remove("is-exporting");
    node.style.background = prevBg;
  }

  const width = Math.max(1, Math.round(node.offsetWidth * pixelRatio));
  const height = Math.max(1, Math.round(node.offsetHeight * pixelRatio));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return (await fetch(overlayUrl)).blob();

  if (format === "jpg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(mapSnapshot, 0, 0, width, height);
  ctx.drawImage(await loadImage(overlayUrl), 0, 0, width, height);
  return canvasToFormatBlob(out, format);
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
