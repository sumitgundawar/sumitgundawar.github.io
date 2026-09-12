import { useCallback, useEffect, useState } from "react";
import { loadProgress, saveProgress } from "./api";

const KEY = "learn-progress-v1";

export type Progress = Record<string, boolean>;

function read(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Progress) : {};
  } catch {
    return {};
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(read);

  useEffect(() => {
    let live = true;
    loadProgress().then((remote) => {
      if (!live || !remote) return;
      setProgress((local) => {
        const merged = { ...remote, ...local };
        try {
          window.localStorage.setItem(KEY, JSON.stringify(merged));
        } catch {
        }
        return merged;
      });
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === KEY) setProgress(read());
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const record = useCallback((topicId: string, correct: boolean) => {
    setProgress((prev) => {
      if (topicId in prev) return prev;
      const next = { ...prev, [topicId]: correct };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
      }
      saveProgress(topicId, correct);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
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
