import { FONT_FAMILIES } from "../types";

const loading = new Map<string, Promise<void>>();
const embedCache = new Map<string, Promise<string>>();

export function fontStack(family: string) {
  return `"${family}"`;
}

/** Google Fonts CSS v1 shape, served by Bunny: /css?family=Name:400,700|Other+Name:400,700 */
export function bunnyFontsCssUrl(families: readonly string[] = FONT_FAMILIES) {
  const family = families
    .map((name) => {
      const slug = name.replace(/ /g, "+");
      if (name === "Bebas Neue") return `${slug}:400`;
      if (name === "Inter") return `${slug}:400,500,600,700`;
      return `${slug}:400,700`;
    })
    .join("|");
  return `https://fonts.bunny.net/css?family=${family}&display=swap`;
}

function bunnyFamilyCssUrl(family: string) {
  return bunnyFontsCssUrl([family]);
}

export function installBunnyFonts() {
  const id = "waypic-bunny-fonts";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = bunnyFontsCssUrl();
  document.head.appendChild(link);
}

export function ensureFont(family: string) {
  let job = loading.get(family);
  if (!job) {
    job = (async () => {
      installBunnyFonts();
      try {
        await document.fonts.load(`400 32px "${family}"`);
        if (family !== "Bebas Neue") await document.fonts.load(`700 32px "${family}"`);
      } catch {
        /* keep fallback */
      }
    })();
    loading.set(family, job);
  }
  return job;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function latinFontFaces(css: string) {
  const faces = css.match(/@font-face\s*\{[\s\S]*?\}/g) ?? [];
  const kept = faces.filter((face) => {
    if (!/unicode-range/i.test(face)) return true;
    return /U\+0000/i.test(face) || /U\+0100/i.test(face);
  });
  return (kept.length ? kept : faces).join("\n");
}

export function fontEmbedCSS(family: string) {
  let job = embedCache.get(family);
  if (!job) {
    job = (async () => {
      await ensureFont(family);
      const res = await fetch(bunnyFamilyCssUrl(family));
      let css = latinFontFaces(await res.text());
      const urls = [...css.matchAll(/url\((['"]?)(https:[^'")]+)\1\)/g)].map((m) => m[2]);
      for (const url of [...new Set(urls)]) {
        const font = await fetch(url);
        const buf = await font.arrayBuffer();
        const mime = font.headers.get("content-type") || "font/woff2";
        css = css.split(url).join(`data:${mime};base64,${arrayBufferToBase64(buf)}`);
      }
      return css;
    })();
    embedCache.set(family, job);
  }
  return job;
}
