import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { StatusPage } from "@/components/StatusPage";
import { useAnalyticsPageview } from "@/lib/hooks";

/* The profile page is the entry point and stays in the main bundle. The two
   learning pages carry the entire curriculum, around 200kB of source data, which someone landing here and leaving should never download. */
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

/* Reset scroll on forward navigation, and only on forward navigation.
 *
 * Opening a card from halfway down /learn landed the reader mid-topic, past the
 * title, because the router keeps the scroll position by default. Back is left
 * alone deliberately: returning to a list and finding your place is correct,
 * and it already worked. */
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.history.state?.idx === undefined || window.history.state.idx === 0) {
      window.scrollTo(0, 0);
      return;
    }
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type !== "back_forward") window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* A keyboard user should not have to tab through the whole nav on every page.
 * Visible only when focused, which is the point: it is for people who are
 * tabbing, and invisible to everyone else. */
function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 mono text-[13px]"
      style={{ background: "var(--surface-2)", color: "var(--c-text)", border: "1px solid var(--hair-strong)" }}
    >
      Skip to content
    </a>
  );
}

/** Deliberately plain: the chunk arrives in well under a second on any real
 *  connection, and a spinner that flashes is worse than a quiet moment. */
function RouteFallback() {
  return <div className="min-h-[100dvh]" aria-busy="true" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <SkipLink />
      <AnalyticsListener />
      <ScrollReset />
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
