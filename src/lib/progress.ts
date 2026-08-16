import { useCallback, useEffect, useState } from "react";

/* Which checks have been answered, and whether they were right.
 *
 * Previously nothing was kept at all: TopicView is mounted conditionally, so
 * collapsing a topic destroyed the answer. Answer a question, collapse it,
 * expand it again and your answer was gone, across a curriculum of 122 topics
 * that people would work through over weeks.
 *
 * localStorage rather than a backend, deliberately. There are no accounts here
 * and adding them for a progress bar would be a poor trade. */

const KEY = "learn-progress-v1";

export type Progress = Record<string, boolean>;

function read(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Progress) : {};
  } catch {
    // Private browsing, a full quota, or somebody put junk in the key.
    // None of that is worth breaking the page over.
    return {};
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(read);

  // Keep two tabs in step, since the same person may well have both open.
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === KEY) setProgress(read());
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const record = useCallback((topicId: string, correct: boolean) => {
    setProgress((prev) => {
      if (topicId in prev) return prev; // first answer stands
      const next = { ...prev, [topicId]: correct };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* still works for this session */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setProgress({});
  }, []);

  return { progress, record, reset };
}

export function summarise(progress: Progress, topicIds: string[]) {
  const answered = topicIds.filter((id) => id in progress);
  const correct = answered.filter((id) => progress[id]);
  return { answered: answered.length, correct: correct.length, total: topicIds.length };
}
