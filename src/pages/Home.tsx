import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { GitHub } from "react-feather";
import { Attachment } from "../components/Attachment";
import { Dropzone } from "../components/Dropzone";
import { CtaButton } from "../components/ui/Button";
import { Logo } from "../components/Logo";
import { useStore } from "../store";

const enter = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export function Home() {
  const { files, addFiles, removeFile, readyFiles, goEditor, banner } = useStore();
  const [headerHidden, setHeaderHidden] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

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
          initial={reduce ? false : "hidden"}
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          <motion.h1 variants={reduce ? undefined : enter}>Remember where you’ve been.</motion.h1>
          <motion.p variants={reduce ? undefined : enter}>
            Create stylised map with your .gpx files to print or share with others online
          </motion.p>
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={reduce ? { duration: 0 } : { duration: 0.28, delay: 0.2, ease: "easeOut" }}
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
              <GitHub size={16} strokeWidth={2} aria-hidden />
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
