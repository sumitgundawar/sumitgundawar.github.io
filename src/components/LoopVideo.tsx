import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion, trackClick } from "@/lib/hooks";

export function LoopVideo({
  src,
  poster,
  label,
  event,
  className = "",
}: {
  src: string;
  poster: string;

  label: string;

  event?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  const [wanted, setWanted] = useState(!reduced);
  const [playing, setPlaying] = useState(false);

  useEffect(() => setWanted(!reduced), [reduced]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!wanted) {
      el.pause();
      setPlaying(false);
      return;
    }

    const start = () => {
      el.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    };

    if (typeof IntersectionObserver !== "function") {
      start();
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wanted]);

  return (
    <div
      className={`relative overflow-hidden border border-rule-2 ${className}`}
      style={{ background: "var(--ink-3)" }}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        className="block w-full aspect-[4/5] object-cover"
      />
      <button
        type="button"
        onClick={() => {
          const next = !wanted;
          setWanted(next);
          if (event) trackClick(event, { action: next ? "play" : "pause" });
        }}
        aria-label={playing ? `Pause: ${label}` : `Play: ${label}`}
        aria-pressed={!playing}

        className="absolute bottom-0 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <span
          className="flex items-center justify-center gap-[3px]"
          style={{
            width: 22,
            height: 22,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            backdropFilter: "blur(2px)",
          }}
        >
          {playing ? (
            <>
              <span aria-hidden style={{ width: 2, height: 9, background: "currentColor" }} />
              <span aria-hidden style={{ width: 2, height: 9, background: "currentColor" }} />
            </>
          ) : (
            <span
              aria-hidden
              style={{
                width: 0,
                height: 0,
                marginLeft: 2,
                borderTop: "5px solid transparent",
                borderBottom: "5px solid transparent",
                borderLeft: "8px solid currentColor",
              }}
            />
          )}
        </span>
      </button>
    </div>
  );
}
