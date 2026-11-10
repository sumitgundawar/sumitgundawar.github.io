import { useMemo, useState } from "react";
import { Reveal } from "./Reveal";
import { SPRING } from "@/lib/motion";
import { articles } from "@/data/content";

const firstSentence = (text: string) => {
  const stop = text.indexOf(". ");
  return stop > 0 ? text.slice(0, stop + 1) : text;
};

export function Evidence() {
  const outlets = useMemo(() => {
    const byOutlet = new Map<string, typeof articles>();
    for (const article of articles) {
      const list = byOutlet.get(article.publication) ?? [];
      list.push(article);
      byOutlet.set(article.publication, list);
    }
    return [...byOutlet.entries()].map(([name, list]) => ({ name, list }));
  }, []);

  const [active, setActive] = useState(0);
  const outlet = outlets[active];
  const piece = outlet.list[0];

  return (
    <div className="ev">
      <ul className="ev-list">
        {outlets.map((item, i) => (
          <li key={item.name}>
            <button
              type="button"
              className="ev-pick"
              data-active={i === active ? "true" : "false"}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ev-index tnum">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="ev-outlet">{item.name}</span>
                <span className="ev-count">
                  {item.list.length} {item.list.length === 1 ? "piece" : "pieces"}
                </span>
              </span>
              <span className="ev-rule" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="ev-panel">
        <blockquote className="ev-quote">
          <Reveal
            key={piece.id}
            text={firstSentence(piece.summary)}
            by="word"
            stagger={22}
            config={SPRING.COPY}
            gap={0.24}
          />
        </blockquote>
        <p className="ev-meta">
          {piece.title}
        </p>
        <p className="ev-sub">
          {outlet.name}, {piece.date}
        </p>
        <a
          href={piece.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ev-read"
        >
          Read it
        </a>
      </div>
    </div>
  );
}
