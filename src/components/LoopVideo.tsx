import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion, trackClick } from "@/lib/hooks";

/* A short silent loop that costs nothing until it is on screen.
 *
 * preload="none" plus a poster means the browser fetches the poster and stops
 * there, so the clip is not on the critical path for anyone. The video only
 * loads when an observer says it is actually visible, and it is paused again
 * when it leaves, which matters on a phone where a decoding video costs
 * battery for something nobody is looking at.
 *
 * The poster is deliberately the clip's own first frame. Any other frame shows
 * a jump at the moment playback starts, which reads as a glitch.
 *
 * A loop runs indefinitely, so WCAG 2.2.2 applies: there has to be a way to
 * stop it. Hence the toggle, which is also the whole control surface: no
 * scrubber, no volume, because there is no audio track to control. Someone who
 * has asked their system for reduced motion gets the still frame and starts
 * paused; the same button opts them in.
 */

export function LoopVideo({
  src,
  poster,
  label,
  event,
  className = "",
}: {
  src: string;
  poster: string;
  /** Describes the moving content, for the video element and the toggle. */
  label: string;
  /** Analytics name, so it is visible whether anyone plays this at all. */
  event?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  // What the visitor wants. Reduced motion means "not unless I ask".
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
      // Autoplay is refused in some settings even when muted. That is a fine
      // outcome: the poster stays and the button still works.
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
    <div className={`relative overflow-hidden border border-hair ${className}`} style={{ background: "var(--surface-2)" }}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        className="block w-full h-full object-cover"
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
        /* 44px of hit area, because a thumb needs it, with a glyph a fraction of
           that size inside. Spelling out "pause" cost a quarter of the tile on a
           phone; the shapes are drawn rather than typed so no font has to have
           them. */
        className="absolute bottom-0 right-0 min-h-[44px] min-w-[44px] flex items-end justify-end p-2.5"
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
