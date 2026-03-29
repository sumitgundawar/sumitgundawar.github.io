import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import { cn, scrollToElement } from "@/lib/utils";
import { trackButtonClick, trackCVDownload } from "@/lib/analytics";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import AnimatedCounter from "@/components/AnimatedCounter";
import TextReveal from "@/components/TextReveal";
import MagneticButton from "@/components/MagneticButton";

interface HeroSectionProps {
  className?: string;
}

const HeroSection = ({ className }: HeroSectionProps) => {
  const imageRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fade in tag, description, CTA
    const elements = [tagRef.current, descRef.current, ctaRef.current];
    elements.forEach((el, i) => {
      if (!el) return;
      gsap.fromTo(el,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, delay: 0.6 + i * 0.15, ease: 'power3.out' }
      );
    });

    // Parallax on scroll for profile image
    if (imageRef.current) {
      ScrollTrigger.create({
        trigger: imageRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          gsap.set(imageRef.current, { y: self.progress * 60 });
        },
      });
    }
  }, []);

  return (
    <section
      id="about"
      className={cn(
        "relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-24 pb-16",
        className
      )}
    >
      <div className="absolute inset-0 hero-surface" />
      <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-center gap-12 md:gap-16">
        <div className="w-full md:w-3/5 flex flex-col items-center md:items-start">
          <p
            ref={tagRef}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground border border-border bg-card/50 px-4 py-1.5 rounded-full mb-8 opacity-0"
          >
            Software Engineer - London, UK
          </p>

          <TextReveal
            text="Sumit Gundawar"
            as="h1"
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-center md:text-left mb-6 font-space-grotesk text-foreground tracking-tight"
            mode="chars"
            stagger={0.03}
            delay={0.1}
          />

          <p
            ref={descRef}
            className="text-lg md:text-xl text-muted-foreground text-center md:text-left mb-10 max-w-xl leading-relaxed opacity-0"
          >
            I build products that ship and systems that scale. From a CPD-accredited
            learning platform to demand forecasting at PepsiCo, I have delivered
            13+ products as a sole engineer and contributed to systems driving
            over £200M in annual revenue.
          </p>

          <div ref={ctaRef} className="flex flex-wrap gap-4 opacity-0">
            <MagneticButton>
              <Button
                className="bg-portfolio-blue hover:bg-portfolio-dark-blue text-white px-8 py-6 text-base"
                onClick={() => {
                  trackButtonClick("hero_view_work");
                  scrollToElement('projects');
                }}
              >
                View my work
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </MagneticButton>
            <MagneticButton>
              <a
                href="/uploads/Sumit_Gundawar_CV.pdf"
                download="Sumit_Gundawar_CV.pdf"
                className="inline-block"
                onClick={() => {
                  trackButtonClick("hero_download_cv");
                  trackCVDownload();
                }}
              >
                <Button variant="outline" className="border-portfolio-blue text-portfolio-blue hover:bg-portfolio-blue/10 py-6 text-base">
                  <Download className="mr-2 h-4 w-4" />
                  Download CV
                </Button>
              </a>
            </MagneticButton>
          </div>
        </div>

        <div ref={imageRef} className="w-full md:w-2/5 flex justify-center">
          <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
            <div className="absolute -inset-1 rounded-2xl border border-portfolio-blue/15" />
            <img
              src="/uploads/b4e91885-fcdb-4f9e-bcb4-dbdd8c9f4387.png"
              alt="Sumit Gundawar"
              className="relative object-cover w-full h-full rounded-2xl border border-border shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Impact metrics */}
      <div
        ref={metricsRef}
        className="relative mt-20 pt-12 border-t border-border"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <AnimatedCounter
            target={13}
            suffix="+"
            label="Shipped products"
            sublabel="as sole engineer"
          />
          <AnimatedCounter
            target={200}
            prefix="£"
            suffix="M+"
            label="Revenue impact"
            sublabel="PepsiCo forecasting"
          />
          <AnimatedCounter
            target={500}
            prefix="£"
            suffix="k+"
            label="E-commerce revenue"
            sublabel="since launch"
          />
          <AnimatedCounter
            target={83}
            suffix="%"
            label="Forecast accuracy"
            sublabel="up from 51%"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
