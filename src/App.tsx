import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { StatusPage } from "@/components/StatusPage";
import { useAnalyticsPageview, useCanonical } from "@/lib/hooks";

/* The profile page is the entry point and stays in the main bundle. Every other
   page is fetched when it is first visited, and the learn material is split
   again beneath that, one chunk per group of cards, so opening one card does
   not download the whole curriculum. */
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

/** Points every route's canonical at itself.
 *
 *  Here rather than in each page, because the tag used to be a single static
 *  line in index.html naming the home page, which the prerenderer then copied
 *  into all 53 routes. A page that forgets to set it is a page claiming to be
 *  the home page, and Google acts on that by not indexing it. */
function Canonical() {
  useCanonical();
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
      {/* One wrapper, keyed by path, so a route change replays the enter
          animation. Opacity and transform only: nothing here can move the
          document, and the prerenderer captures the DOM rather than the frame,
          so the text is present in the HTML whatever the animation is doing. */}
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
