import { useCallback, useEffect, useState } from "react";
import { loadProgress, saveProgress } from "./api";

/* Which checks have been answered, and whether they were right.
 *
 * Previously nothing was kept at all: TopicView is mounted conditionally, so
 * collapsing a topic destroyed the answer. Answer a question, collapse it,
 * expand it again and your answer was gone, across a curriculum of 122 topics
 * that people would work through over weeks.
 *
 * localStorage is still the source of truth for the current tab, because it is
 * synchronous and works offline. It is now mirrored to the API as well, since
 * localStorage alone means progress dies in whichever browser earned it: work
 * through twenty topics on a phone and the laptop knows nothing about it. The
 * server copy is merged in on mount and never overwrites a local answer, so a
 * slow network cannot roll back something just answered. */

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

  /* Merge whatever the server has, once, on mount. Local wins on conflict: a
     local entry is something this person answered here, and a round trip must
     never appear to undo it. */
  useEffect(() => {
    let live = true;
    loadProgress().then((remote) => {
      if (!live || !remote) return;
      setProgress((local) => {
        const merged = { ...remote, ...local };
        try {
          window.localStorage.setItem(KEY, JSON.stringify(merged));
        } catch {
          /* session only */
        }
        return merged;
      });
    });
    return () => {
      live = false;
    };
  }, []);

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
      saveProgress(topicId, correct); // best effort, never awaited
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
