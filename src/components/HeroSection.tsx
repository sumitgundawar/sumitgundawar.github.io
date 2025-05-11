
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import { cn, scrollToElement } from "@/lib/utils";

interface HeroSectionProps {
  className?: string;
}

const HeroSection = ({ className }: HeroSectionProps) => {
  return (
    <section
      id="about"
      className={cn(
        "min-h-screen flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-20",
        className
      )}
    >
      <div className="w-full md:w-1/2 flex flex-col items-center md:items-start animate-fade-in">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center md:text-left mb-6 font-space-grotesk text-portfolio-charcoal">
          Hi, I'm{" "}
          <span className="text-portfolio-blue">Sumit Gundawar</span>
        </h1>
        <p className="text-lg md:text-xl text-portfolio-gray text-center md:text-left mb-8 max-w-2xl">
          Results-driven Data Engineer with expertise in ETL pipeline development, data modeling, and cloud-based data solutions. Based in London, UK.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button 
            className="bg-portfolio-blue hover:bg-portfolio-dark-blue text-white px-6 py-6"
            onClick={() => {
              scrollToElement('projects');
              // Track this interaction in Google Analytics
              if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'view_projects', {
                  event_category: 'navigation',
                  event_label: 'View My Work Button'
                });
              }
            }}
          >
            View My Work
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <a href="/uploads/Sumit_Gundawar_CV.pdf" download="Sumit_Gundawar_CV.pdf" className="inline-block">
            <Button variant="outline" className="border-portfolio-blue text-portfolio-blue hover:bg-portfolio-light-blue py-6">
              <Download className="mr-2 h-4 w-4" />
              Download CV
            </Button>
          </a>
        </div>
      </div>
      <div className="w-full md:w-1/2 mt-8 md:mt-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="relative mx-auto w-64 h-64 md:w-[350px] md:h-[350px]">
          <div className="absolute inset-0 rounded-full bg-portfolio-blue/20"></div>
          <img
            src="/uploads/b4e91885-fcdb-4f9e-bcb4-dbdd8c9f4387.png"
            alt="Sumit Gundawar"
            className="object-cover w-full h-full rounded-full p-2"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
