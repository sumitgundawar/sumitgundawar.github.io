import { Reveal } from "./Reveal";
import { SPRING } from "@/lib/motion";
import { identity } from "@/data/content";

const ROLES = ["Backend", "Platform", "AI inference", "Guardrails"];

export function HeroName() {
  return (
    <section id="top" className="hero">
      <div className="hero-top shell">
        <div className="hero-roles">
          <span className="brow" data-allow-lowercase>
            <span className="brow-dot" aria-hidden />
            engineer_013
          </span>
          <h2 className="hero-rolelist display" data-display>
            {ROLES.map((role, i) => (
              <span key={role} className="hero-role">
                <Reveal
                  text={role}
                  by="word"
                  stagger={0}
                  delay={300 + i * 80}
                  config={SPRING.ROW}
                  gap={0.26}
                />
              </span>
            ))}
          </h2>
        </div>

        <p className="hero-desc">
          <Reveal
            text="I build systems that survive production. Sole engineer on a multi-product clinical platform in London, and before that the pipelines behind PepsiCo global supply chain."
            by="word"
            stagger={14}
            delay={700}
            config={SPRING.COPY}
            gap={0.24}
          />
        </p>
      </div>

      <div className="hero-figure" aria-hidden>
        <img
          src="/sumit-cutout.webp"
          alt=""
          width={563}
          height={794}
          decoding="async"
          fetchPriority="high"
        />
      </div>

      <div className="hero-base" aria-hidden />

      <h1 className="hero-name display" data-display>
        <span className="sr-only">{identity.name}</span>
        <span className="hero-line" aria-hidden>
          <Reveal text="Sumit" by="letter" stagger={52} delay={180} config={SPRING.NAME} gap={0} />
        </span>
        <span className="hero-line" aria-hidden>
          <Reveal text="Gundawar" by="letter" stagger={52} delay={420} config={SPRING.NAME} gap={0} />
        </span>
      </h1>

      <div className="hero-foot shell">
        <span className="hero-cue">
          <span className="hero-cue-rule" aria-hidden />
          Scroll
        </span>
        <a href={`mailto:${identity.email}`} className="hero-mail">
          {identity.email}
        </a>
      </div>
    </section>
  );
}
