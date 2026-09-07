export type Aspect = "1:1" | "4:5" | "9:16" | "3:2";
export type MapStyleId = "none" | "positron" | "bright" | "liberty" | "dark" | "fiord";
export type Units = "metric" | "imperial";
export type ColorMode = "solid" | "gradient";
export type Resolution = "standard" | "high" | "social";
export type FileFormat = "png" | "jpg";
export type UploadStatus = "uploading" | "ready" | "error";

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: number;
  dist: number;
}

export interface RouteStats {
  distanceM: number;
  durationS: number | null;
  elevationGainM: number | null;
  movingS: number | null;
  hasElevation: boolean;
  hasTime: boolean;
}

export interface StyleSettings {
  mapStyle: MapStyleId;
  aspect: Aspect;
  units: Units;
  showDistanceMarkers: boolean;
  markerIntervalKm: 1 | 5 | 10 | 20;
  pathWeight: number;
  routeColor: string;
  routeColorMode: ColorMode;
  fontFamily: string;
  fontSize: number;
  showDistance: boolean;
  showDuration: boolean;
  showPace: boolean;
  showElevation: boolean;
  showStatsOverlay: boolean;
  showElevationProfile: boolean;
  elevationColor: string;
  elevationColorMode: ColorMode;
  resolution: Resolution;
  format: FileFormat;
}

export interface RouteFile {
  id: string;
  filename: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  heading: string;
  points: TrackPoint[];
  stats: RouteStats;
  style: StyleSettings;
}

export const ASPECTS: Record<Aspect, { w: number; h: number }> = {
  "1:1": { w: 1, h: 1 },
  "4:5": { w: 4, h: 5 },
  "9:16": { w: 9, h: 16 },
  "3:2": { w: 3, h: 2 },
};

export function canvasSizeForFrame(aspect: Aspect, maxW: number, maxH: number) {
  const { w, h } = ASPECTS[aspect];
  const scale = Math.min(maxW / w, maxH / h);
  return {
    width: Math.max(1, Math.floor(w * scale)),
    height: Math.max(1, Math.floor(h * scale)),
  };
}

export const MAP_STYLES: { id: MapStyleId; label: string; url: string | null }[] = [
  { id: "none", label: "No map", url: null },
  { id: "positron", label: "Positron", url: "https://tiles.openfreemap.org/styles/positron" },
  { id: "bright", label: "Bright", url: "https://tiles.openfreemap.org/styles/bright" },
  { id: "liberty", label: "Liberty", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "dark", label: "Dark", url: "https://tiles.openfreemap.org/styles/dark" },
  { id: "fiord", label: "Fiord", url: "https://tiles.openfreemap.org/styles/fiord" },
];

export const FONT_FAMILIES = [
  "Inter",
  "Grandstander",
  "Outfit",
  "Space Grotesk",
  "IBM Plex Sans",
  "DM Sans",
  "Manrope",
  "Karla",
  "Work Sans",
  "Archivo",
  "Oswald",
  "Bebas Neue",
  "Merriweather",
  "Libre Baskerville",
  "Source Serif 4",
  "Playfair Display",
  "Fraunces",
  "Roboto Mono",
];

export const FONT_SIZES = [8, 12, 16, 20, 24, 28, 32, 36];

export function defaultStyle(): StyleSettings {
  return {
    mapStyle: "positron",
    aspect: "1:1",
    units: "metric",
    showDistanceMarkers: false,
    markerIntervalKm: 5,
    pathWeight: 6,
    routeColor: "#000000",
    routeColorMode: "solid",
    fontFamily: "Inter",
    fontSize: 16,
    showDistance: true,
    showDuration: true,
    showPace: false,
    showElevation: true,
    showStatsOverlay: false,
    showElevationProfile: false,
    elevationColor: "#000000",
    elevationColorMode: "solid",
    resolution: "standard",
    format: "png",
  };
}
