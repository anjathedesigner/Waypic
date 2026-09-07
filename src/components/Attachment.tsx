import { motion } from "framer-motion";
import { X } from "react-feather";
import { formatFileSize } from "../lib/geo";
import type { RouteFile } from "../types";

export function Attachment({ file, onRemove }: { file: RouteFile; onRemove: () => void }) {
  const uploading = file.status === "uploading";
  const error = file.status === "error";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
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
        <X size={24} color="var(--foreground)" />
      </button>
    </motion.div>
  );
}
