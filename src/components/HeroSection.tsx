
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import { cn, scrollToElement } from "@/lib/utils";
import { trackButtonClick } from "@/lib/analytics";

interface HeroSectionProps {
  className?: string;
}

const HeroSection = ({ className }: HeroSectionProps) => {
  return (
    <section
      id="about"
      className={cn(
        "relative overflow-hidden min-h-screen flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-20",
        className
      )}
    >
      <div className="absolute inset-0 hero-surface" />
      <div className="absolute inset-0 bg-grid opacity-35 pointer-events-none" />

      <div className="relative w-full md:w-1/2 flex flex-col items-center md:items-start animate-fade-in">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground border border-border bg-background/50 px-3 py-1.5 rounded-full mb-6">
          Product + Software Engineer · London, UK
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center md:text-left mb-6 font-space-grotesk text-foreground tracking-tight">
          Hi, I'm{" "}
          <span className="text-portfolio-blue">Sumit Gundawar</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground text-center md:text-left mb-8 max-w-2xl">
          Product & Software Engineer building API platforms, integrations, and full-stack systems — with a background in distributed data/ML pipelines and production operations. Based in London, UK.
        </p>
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            "API design + integrations",
            "Full-stack delivery",
            "Distributed systems",
            "Observability + reliability",
            "Data/ML pipelines",
          ].map((chip) => (
            <span
              key={chip}
              className="px-3 py-1 rounded-full bg-portfolio-blue/10 text-portfolio-blue text-sm border border-portfolio-blue/20"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <Button 
            className="bg-portfolio-blue hover:bg-portfolio-dark-blue text-white px-6 py-6"
            onClick={() => {
              trackButtonClick("hero_view_projects");
              scrollToElement('projects');
            }}
          >
            View Projects
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <a
            href="/uploads/Sumit_Gundawar_CV.pdf"
            download="Sumit_Gundawar_CV.pdf"
            className="inline-block"
            onClick={() => trackButtonClick("hero_download_cv")}
          >
            <Button variant="outline" className="border-portfolio-blue text-portfolio-blue hover:bg-muted py-6">
              <Download className="mr-2 h-4 w-4" />
              Download CV
            </Button>
          </a>
        </div>
      </div>
      <div className="relative w-full md:w-1/2 mt-8 md:mt-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="relative mx-auto w-72 h-72 md:w-[380px] md:h-[380px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-portfolio-blue/30 via-transparent to-portfolio-blue/10 blur-2xl" />
          <div className="absolute inset-6 rounded-3xl bg-background/50 border border-border backdrop-blur-xl" />
          <img
            src="/uploads/b4e91885-fcdb-4f9e-bcb4-dbdd8c9f4387.png"
            alt="Sumit Gundawar"
            className="relative object-cover w-full h-full rounded-3xl border border-border shadow-xl"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
