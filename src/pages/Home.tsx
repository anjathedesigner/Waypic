import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { GitHub } from "react-feather";
import { Attachment } from "../components/Attachment";
import { Dropzone } from "../components/Dropzone";
import { CtaButton } from "../components/ui/Button";
import { Logo } from "../components/Logo";
import { useStore } from "../store";

export function Home() {
  const { files, addFiles, removeFile, readyFiles, goEditor, banner } = useStore();
  const [headerHidden, setHeaderHidden] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    let lastY = el.scrollTop;
    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastY;
      lastY = y;
      if (y <= 16) {
        setHeaderHidden(false);
        return;
      }
      if (delta > 6) setHeaderHidden(true);
      else if (delta < -6) setHeaderHidden(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="home" ref={pageRef}>
      <header className={`home-header ${headerHidden ? "is-hidden" : ""}`}>
        <Logo />
      </header>
      <main className="home-main">
        <motion.div
          className="hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <h1>Remember where you’ve been.</h1>
          <p>Create stylised map with your .gpx files to print or share with others online</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.14 }}
          style={{ width: "min(800px, 100%)" }}
        >
          <Dropzone onFiles={addFiles} />
        </motion.div>
        {banner ? (
          <div className="banner" role="status">
            {banner}
          </div>
        ) : null}
        <div className="home-upload">
          <div className="files" aria-live="polite">
            <AnimatePresence initial={false}>
              {files.map((f) => (
                <Attachment key={f.id} file={f} onRemove={() => removeFile(f.id)} />
              ))}
            </AnimatePresence>
          </div>
          {readyFiles.length ? (
            <div className="home-cta">
              <CtaButton onClick={goEditor}>
                Edit {readyFiles.length} {readyFiles.length === 1 ? "file" : "files"}
              </CtaButton>
            </div>
          ) : null}
        </div>
      </main>
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <Logo />
            <a className="home-footer-github" href="#" aria-label="GitHub">
              <GitHub size={16} color="var(--icon)" />
            </a>
          </div>
          <div className="home-footer-col">
            <p className="home-footer-lead">Free, ad-free and open source</p>
            <p>
              The website is free to use, without ads, and the source code is publicly available on GitHub.
            </p>
          </div>
          <div className="home-footer-col">
            <p className="home-footer-lead">Privacy-friendly</p>
            <p>Your GPX files never leave your browser. No tracking, no data collection.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
