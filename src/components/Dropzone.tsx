import { Download } from "react-feather";
import { useId, useState } from "react";

export function Dropzone({ onFiles }: { onFiles: (files: FileList | File[]) => void }) {
  const inputId = useId();
  const [active, setActive] = useState(false);

  return (
    <label
      htmlFor={inputId}
      className={`dropzone ${active ? "is-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <Download size={36} color="var(--foreground)" />
      <div>
        <h2>Drop one or more .gpx files here</h2>
        <div className="dropzone-desc">
          <span>or</span>
          <span className="dropzone-browse">browse your device.</span>
          <span>Everything is edited in your browser.</span>
        </div>
      </div>
      <input
        id={inputId}
        className="sr-only"
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
