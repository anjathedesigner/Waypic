import { motion, useReducedMotion } from "framer-motion";
import { X } from "react-feather";
import { formatFileSize } from "../lib/geo";
import type { RouteFile } from "../types";

export function Attachment({ file, onRemove }: { file: RouteFile; onRemove: () => void }) {
  const uploading = file.status === "uploading";
  const error = file.status === "error";
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, filter: "blur(4px)" }}
      transition={{ duration: reduce ? 0 : 0.15, ease: "easeOut" }}
      className="attachment"
    >
      <div className="attachment-meta">
        <div className="attachment-name">{file.filename}</div>
        <div
          className={`attachment-status ${uploading ? "is-uploading" : ""} ${error ? "is-error" : ""}`}
        >
          {error ? (
            <span>{file.error ?? "Couldn't read this file"}</span>
          ) : uploading ? (
            <>
              <span>Uploading</span>
              <span className="dot" />
              <span>{Math.round(file.progress)}%</span>
            </>
          ) : (
            <>
              <span>gpx</span>
              <span className="dot" />
              <span>{formatFileSize(file.size)}</span>
            </>
          )}
        </div>
      </div>
      <button type="button" className="attachment-x" aria-label={`Remove ${file.filename}`} onClick={onRemove}>
        <X size={20} strokeWidth={2} aria-hidden />
      </button>
    </motion.div>
  );
}
