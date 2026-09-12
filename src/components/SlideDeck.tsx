import { Plus, X } from "react-feather";
import { motion } from "framer-motion";
import { useRef } from "react";
import { canvasSizeForFrame, type RouteFile } from "../types";
import { RouteCanvas } from "./RouteCanvas";

const SLOT_W = 192;
const SLOT_H = 224;

export function SlideDeck({
  files,
  selectedId,
  bulk,
  frame,
  onSelect,
  onRemove,
  onAdd,
}: {
  files: RouteFile[];
  selectedId: string | null;
  bulk?: boolean;
  frame: { maxW: number; maxH: number };
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (list: FileList | File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <nav className="deck" aria-label="Uploaded routes">
      {files.map((file, i) => {
        const selected = file.id === selectedId;
        const { width, height } = canvasSizeForFrame(file.style.aspect, frame.maxW, frame.maxH);
        const fit = Math.min(SLOT_W / width, SLOT_H / height);
        return (
          <motion.button
            key={file.id}
            type="button"
            layout
            className={`preview ${selected || bulk ? "is-selected" : ""}`}
            aria-current={selected ? "true" : undefined}
            onClick={() => onSelect(file.id)}
          >
            <span className="preview-num">{i + 1}</span>
            <span className="preview-thumb">
              <span className="preview-fit" style={{ width: width * fit, height: height * fit }}>
                <span className="preview-inner" style={{ width, height, transform: `scale(${fit})` }}>
                  <RouteCanvas file={file} width={width} height={height} showMap preview />
                </span>
              </span>
              <span
                className="preview-remove"
                role="button"
                tabIndex={0}
                aria-label={`Remove ${file.filename}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(file.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(file.id);
                  }
                }}
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </span>
            </span>
          </motion.button>
        );
      })}
      <button type="button" className="preview" onClick={() => input.current?.click()} aria-label="Add files">
        <span className="preview-add">
          <Plus size={24} strokeWidth={2} aria-hidden />
        </span>
      </button>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept=".gpx,application/gpx+xml"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) onAdd(e.target.files);
          e.target.value = "";
        }}
      />
    </nav>
  );
}
