import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseGpx } from "./lib/gpx";
import { defaultStyle, type RouteFile, type StyleSettings } from "./types";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 50;

type View = "home" | "editor";

interface Store {
  view: View;
  files: RouteFile[];
  selectedId: string | null;
  banner: string | null;
  goHome: () => void;
  goEditor: () => void;
  addFiles: (list: FileList | File[]) => Promise<void>;
  removeFile: (id: string) => void;
  selectFile: (id: string, opts?: { isolate?: boolean }) => void;
  updateHeading: (id: string, heading: string) => void;
  updateStyle: (id: string, patch: Partial<StyleSettings>) => void;
  selected: RouteFile | null;
  readyFiles: RouteFile[];
  styleScope: "all" | "one";
}

const Ctx = createContext<Store | null>(null);

function uid() {
  return crypto.randomUUID();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("home");
  const [files, setFiles] = useState<RouteFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [styleScope, setStyleScope] = useState<"all" | "one">("all");
  const [banner, setBanner] = useState<string | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const styleScopeRef = useRef(styleScope);
  styleScopeRef.current = styleScope;

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    setBanner(null);
    const prev = filesRef.current;
    const room = MAX_FILES - prev.filter((f) => f.status !== "error").length;
    if (incoming.length > room) setBanner("Too many files at once — max is 50.");
    const accepted = incoming.slice(0, Math.max(0, room));
    if (!accepted.length) return;

    const placeholders: RouteFile[] = accepted.map((file) => ({
      id: uid(),
      filename: file.name,
      size: file.size,
      status: "uploading",
      progress: 8,
      heading: file.name.replace(/\.gpx$/i, ""),
      points: [],
      stats: {
        distanceM: 0,
        durationS: null,
        elevationGainM: null,
        movingS: null,
        hasElevation: false,
        hasTime: false,
      },
      style: {
        ...(filesRef.current.find((f) => f.id === selectedIdRef.current)?.style ?? defaultStyle()),
      },
    }));

    setFiles((prev) => [...prev, ...placeholders]);
    setSelectedId((cur) => cur ?? placeholders[0]?.id ?? null);

    await Promise.all(
      placeholders.map(async (ph, i) => {
        const file = accepted[i];
        const tick = window.setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === ph.id && f.status === "uploading"
                ? { ...f, progress: Math.min(90, f.progress + 7) }
                : f,
            ),
          );
        }, 120);

        try {
          if (!/\.gpx$/i.test(file.name)) {
            throw new Error("Unsupported file type — we only support .gpx files right now");
          }
          if (file.size > MAX_BYTES) {
            throw new Error("File is too big, max limit is 20MB");
          }
          const text = await file.text();
          const parsed = parseGpx(text);
          window.clearInterval(tick);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === ph.id
                ? {
                    ...f,
                    status: "ready",
                    progress: 100,
                    points: parsed.points,
                    stats: parsed.stats,
                    heading: parsed.name || f.heading,
                  }
                : f,
            ),
          );
        } catch (err) {
          window.clearInterval(tick);
          const message = err instanceof Error ? err.message : "Couldn't read this file";
          setFiles((prev) =>
            prev.map((f) =>
              f.id === ph.id ? { ...f, status: "error", error: message, progress: 0 } : f,
            ),
          );
        }
      }),
    );
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      setSelectedId((cur) => {
        if (cur !== id) return cur;
        return next.find((f) => f.status === "ready")?.id ?? next[0]?.id ?? null;
      });
      if (!next.some((f) => f.status === "ready")) setView("home");
      return next;
    });
  }, []);

  const updateHeading = useCallback((id: string, heading: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, heading } : f)));
  }, []);

  const updateStyle = useCallback((id: string, patch: Partial<StyleSettings>) => {
    setFiles((prev) => {
      if (styleScopeRef.current === "all") {
        return prev.map((f) =>
          f.status === "error" ? f : { ...f, style: { ...f.style, ...patch } },
        );
      }
      return prev.map((f) => (f.id === id ? { ...f, style: { ...f.style, ...patch } } : f));
    });
  }, []);

  const selectFile = useCallback((id: string, opts?: { isolate?: boolean }) => {
    if (opts?.isolate) setStyleScope("one");
    setSelectedId(id);
  }, []);

  const selected = files.find((f) => f.id === selectedId) ?? null;
  const readyFiles = files.filter((f) => f.status === "ready");

  const value = useMemo<Store>(
    () => ({
      view,
      files,
      selectedId,
      banner,
      goHome: () => {
        setStyleScope("all");
        setView("home");
      },
      goEditor: () => {
        setStyleScope("all");
        setView("editor");
      },
      addFiles,
      removeFile,
      selectFile,
      updateHeading,
      updateStyle,
      selected,
      readyFiles,
      styleScope,
    }),
    [view, files, selectedId, banner, addFiles, removeFile, selectFile, updateHeading, updateStyle, selected, readyFiles, styleScope],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Store missing");
  return ctx;
}
