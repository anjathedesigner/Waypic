import { AnimatePresence, motion } from "framer-motion";
import { Editor } from "./pages/Editor";
import { Home } from "./pages/Home";
import { useStore } from "./store";

export function App() {
  const { view } = useStore();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{ height: "100%" }}
      >
        {view === "home" ? <Home /> : <Editor />}
      </motion.div>
    </AnimatePresence>
  );
}
