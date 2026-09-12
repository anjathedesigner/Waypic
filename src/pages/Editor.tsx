import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader, Sidebar } from "react-feather";
import { AnimatePresence, motion } from "framer-motion";
import { RouteCanvas, type RouteCanvasHandle } from "../components/RouteCanvas";
import { SlideDeck } from "../components/SlideDeck";
import { Toolbar } from "../components/Toolbar";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/Logo";
import { downloadBlob, exportCaptureRatio, nodeToBlob, safeFilename, zipBlobs } from "../lib/export";
import { canvasSizeForFrame, type RouteFile } from "../types";
import { useStore } from "../store";

const COMPACT_MQ = "(max-width: 1100px)";
const STACK_MQ = "(max-width: 834px)";
const TOOLBAR_MIN_VH = 5;
const TOOLBAR_DEFAULT_VH = 20;

function useMq(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

function toolbarMaxVh(body: HTMLElement | null) {
  if (!body) return 95;
  return Math.max(TOOLBAR_MIN_VH, (body.clientHeight / window.innerHeight) * 100);
}

export function Editor() {
  const { selected, readyFiles, selectedId, selectFile, removeFile, addFiles, updateHeading, updateStyle, goHome, styleScope } =
    useStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const routeApi = useRef<RouteCanvasHandle>(null);
  const [exporting, setExporting] = useState<"idle" | "busy" | "done">("idle");
  const [stage, setStage] = useState({ w: 800, h: 800 });
  const [frame, setFrame] = useState({ maxW: 800, maxH: 800 });
  const [deckOpen, setDeckOpen] = useState(false);
  const [toolbarVh, setToolbarVh] = useState(TOOLBAR_DEFAULT_VH);
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; vh: number } | null>(null);
  const compact = useMq(COMPACT_MQ);
  const stack = useMq(STACK_MQ);

  useEffect(() => {
    if (!compact) setDeckOpen(false);
  }, [compact]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !selected) return;
    const fit = () => {
      const styles = getComputedStyle(el);
      const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const maxW = Math.max(80, el.clientWidth - padX);
      const maxH = Math.max(80, el.clientHeight - padY);
      setFrame({ maxW, maxH });
      const next = canvasSizeForFrame(selected.style.aspect, maxW, maxH);
      setStage({ w: next.width, h: next.height });
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, [selected?.style.aspect, selected?.id, stack, compact]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const max = toolbarMaxVh(bodyRef.current);
      const next = drag.vh + ((drag.y - e.clientY) / window.innerHeight) * 100;
      setToolbarVh(Math.min(max, Math.max(TOOLBAR_MIN_VH, next)));
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const label = useMemo(() => {
    if (exporting === "busy") return "Exporting…";
    if (exporting === "done") return "Exported";
    return null;
  }, [exporting]);

  async function captureFile(file: RouteFile) {
    const node = canvasRef.current;
    if (!node) throw new Error("missing canvas");
    const ratio = exportCaptureRatio(file.style.resolution, node.offsetWidth, node.offsetHeight);
    try {
      const mapSnapshot = (await routeApi.current?.settleForExport(ratio)) ?? null;
      return await nodeToBlob(node, file.style.format, ratio, file.style.fontFamily, mapSnapshot);
    } finally {
      routeApi.current?.restoreAfterExport();
    }
  }

  async function exportOne() {
    if (!selected || !canvasRef.current) return;
    setExporting("busy");
    try {
      const blob = await captureFile(selected);
      downloadBlob(blob, `${safeFilename(selected.heading)}.${selected.style.format}`);
      setExporting("done");
      window.setTimeout(() => setExporting("idle"), 1200);
    } catch {
      setExporting("idle");
      window.alert("Export failed. Try a lower resolution or another format.");
    }
  }

  async function exportAll() {
    if (!readyFiles.length || !canvasRef.current) return;
    if (readyFiles.length === 1) {
      await exportOne();
      return;
    }
    setExporting("busy");
    try {
      const startId = selectedId;
      const packed: { name: string; blob: Blob }[] = [];
      for (const file of readyFiles) {
        selectFile(file.id);
        await new Promise((r) => window.setTimeout(r, file.style.mapStyle === "none" ? 80 : 200));
        const blob = await captureFile(file);
        packed.push({ name: `${safeFilename(file.heading)}.${file.style.format}`, blob });
      }
      if (startId) selectFile(startId);
      const zip = await zipBlobs(packed);
      downloadBlob(zip, "waypic.zip");
      setExporting("done");
      window.setTimeout(() => setExporting("idle"), 1200);
    } catch {
      setExporting("idle");
      window.alert("Export failed. Try exporting fewer images.");
    }
  }

  if (!selected) {
    return (
      <div className="editor">
        <header className="editor-header">
          <button type="button" className="logo-btn" onClick={goHome}>
            <Logo />
          </button>
        </header>
      </div>
    );
  }

  const many = readyFiles.length > 1;
  const editingAll = many && styleScope === "all";
  const statusIcon = (
    <AnimatePresence initial={false} mode="popLayout">
      {exporting === "idle" ? null : (
        <motion.span
          key={exporting}
          className="export-status-icon"
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          {exporting === "busy" ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
              <Loader size={16} strokeWidth={2} aria-hidden />
            </motion.span>
          ) : (
            <Check size={16} strokeWidth={2} aria-hidden />
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <div className="editor">
      <header className="editor-header">
        <div className="header-brand">
          {compact ? (
            <button
              type="button"
              className="deck-toggle"
              aria-label={deckOpen ? "Close file previews" : "Open file previews"}
              aria-expanded={deckOpen}
              onClick={() => setDeckOpen((open) => !open)}
            >
              <Sidebar size={16} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
          <button type="button" className="logo-btn" onClick={goHome}>
            <Logo />
          </button>
        </div>
        <label className="heading-edit">
          <input
            value={selected.heading}
            aria-label="Heading"
            onChange={(e) => updateHeading(selected.id, e.target.value)}
          />
        </label>
        <div className="header-actions">
          {many ? (
            <>
              <Button variant="outlined" onClick={exportOne} disabled={exporting === "busy"}>
                {label && exporting !== "idle" ? (
                  <>
                    {statusIcon} {label}
                  </>
                ) : (
                  "Export selected"
                )}
              </Button>
              <Button onClick={exportAll} disabled={exporting === "busy"}>
                {label && exporting !== "idle" ? (
                  <>
                    {statusIcon} {label}
                  </>
                ) : (
                  `Export all (${readyFiles.length}) .zip`
                )}
              </Button>
            </>
          ) : (
            <Button onClick={exportOne} disabled={exporting === "busy"}>
              {label && exporting !== "idle" ? (
                <>
                  {statusIcon} {label}
                </>
              ) : (
                "Export"
              )}
            </Button>
          )}
        </div>
      </header>
      <div
        ref={bodyRef}
        className={`editor-body ${compact ? "is-compact" : ""} ${stack ? "is-stack" : ""} ${deckOpen ? "is-deck-open" : ""}`}
      >
        {compact && deckOpen ? (
          <button type="button" className="deck-backdrop" aria-label="Close file previews" onClick={() => setDeckOpen(false)} />
        ) : null}
        <SlideDeck
          files={readyFiles}
          selectedId={selectedId}
          bulk={editingAll}
          frame={frame}
          onSelect={(id) => {
            selectFile(id, { isolate: id !== selectedId });
            setDeckOpen(false);
          }}
          onRemove={removeFile}
          onAdd={addFiles}
        />
        <div className="stage" ref={stageRef}>
          <div className="canvas-frame">
            <RouteCanvas
              ref={routeApi}
              file={selected}
              width={stage.w}
              height={stage.h}
              showMap
              canvasRef={canvasRef}
            />
          </div>
        </div>
        <div
          className="toolbar-dock"
          style={stack ? { height: `${toolbarVh}vh` } : undefined}
        >
          <div
            className="toolbar-handle"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize toolbar"
            onPointerDown={(e) => {
              if (!stack) return;
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              dragRef.current = { y: e.clientY, vh: toolbarVh };
            }}
          />
          <Toolbar
            file={selected}
            onChange={(patch) => updateStyle(selected.id, patch)}
            scopeNote={
              editingAll ? "Changes apply to all files" : many ? "Changes apply to this file" : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
