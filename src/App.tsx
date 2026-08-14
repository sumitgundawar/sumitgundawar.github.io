import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StatusPage } from "@/components/StatusPage";
import { useAnalyticsPageview } from "@/lib/hooks";

/* The profile page is the entry point and stays in the main bundle. The two
   learning pages carry the entire curriculum — around 200kB of source data —
   which someone landing here and leaving should never download. */
const LearnPage = lazy(() =>
  import("@/components/LearnPage").then((m) => ({ default: m.LearnPage })),
);
const BuildPage = lazy(() =>
  import("@/components/BuildPage").then((m) => ({ default: m.BuildPage })),
);

function AnalyticsListener() {
  useAnalyticsPageview();
  return null;
}

/** Deliberately plain: the chunk arrives in well under a second on any real
 *  connection, and a spinner that flashes is worse than a quiet moment. */
function RouteFallback() {
  return <div className="min-h-[100dvh]" aria-busy="true" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsListener />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<StatusPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:cardId" element={<LearnPage />} />
          <Route path="/build" element={<BuildPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
