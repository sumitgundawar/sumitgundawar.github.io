import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { StatusPage } from "@/components/StatusPage";
import { useAnalyticsPageview, useCanonical } from "@/lib/hooks";

const LearnPage = lazy(() =>
  import("@/components/LearnPage").then((m) => ({ default: m.LearnPage })),
);
const BuildPage = lazy(() =>
  import("@/components/BuildPage").then((m) => ({ default: m.BuildPage })),
);
const ExitPrompt = lazy(() =>
  import("@/components/ExitPrompt").then((m) => ({ default: m.ExitPrompt })),
);
const ArchivePage = lazy(() =>
  import("@/components/ArchivePage").then((m) => ({ default: m.ArchivePage })),
);
const WritingPage = lazy(() =>
  import("@/components/WritingPage").then((m) => ({ default: m.WritingPage })),
);

function AnalyticsListener() {
  useAnalyticsPageview();
  return null;
}

function Canonical() {
  useCanonical();
  return null;
}

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

function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 mono text-[13px]"
      style={{ background: "var(--ink-3)", color: "var(--text-hi)", border: "1px solid var(--rule-3)" }}
    >
      Skip to content
    </a>
  );
}

function RouteFallback() {
  return <div className="min-h-[100dvh]" aria-busy="true" />;
}

function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SkipLink />
      <AnalyticsListener />
      <Canonical />
      <ScrollReset />
      <ExitPrompt />

      <Suspense fallback={<RouteFallback />}>
        <PageTransition>
        <Routes>
          <Route path="/" element={<StatusPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:cardId" element={<LearnPage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/writing" element={<WritingPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/archive/:slug" element={<ArchivePage />} />
        </Routes>
        </PageTransition>
      </Suspense>
    </BrowserRouter>
  );
}
