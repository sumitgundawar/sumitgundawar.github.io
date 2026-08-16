import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self-hosted, semantic three-font system.
import "@fontsource-variable/mona-sans/wght.css";
import "@fontsource/commit-mono/400.css";
import "@fontsource/commit-mono/500.css";
import "@fontsource/commit-mono/600.css";
/* Roman only. Nothing on the site renders serif italic, the .serif class is
   used on two headings and neither is italicised, so the italic faces were
   three files and 270kB of dist that no reader could ever request. */
import "@fontsource-variable/newsreader/opsz.css";

import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
