import { failureModes } from "@/data/failures";

export function Marquee() {
  const words = failureModes.map((mode) => mode.failure.toLowerCase());
  const run = [...words, ...words];

  return (
    <section className="marquee" aria-label="Ways a system fails">
      <ul className="marquee-track">
        {run.map((word, i) => (
          <li key={`${word}-${i}`} className="marquee-item" aria-hidden={i >= words.length}>
            <span data-allow-lowercase>{word}</span>
            <span className="marquee-dot" aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  );
}
