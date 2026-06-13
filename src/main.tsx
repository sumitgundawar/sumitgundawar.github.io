import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self-hosted, semantic three-font system.
import "@fontsource-variable/mona-sans/wght.css";
import "@fontsource/commit-mono/400.css";
import "@fontsource/commit-mono/500.css";
import "@fontsource/commit-mono/600.css";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";

import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
