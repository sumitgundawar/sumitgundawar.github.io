import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";
import { projects, getFeaturedProjects, projectCategories } from "@/data/projects";
import { trackProjectFilter, trackProjectOpen, trackOutboundLink } from "@/lib/analytics";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import TiltCard from "@/components/TiltCard";

interface ProjectsSectionProps {
  className?: string;
}

const ProjectsSection = ({ className }: ProjectsSectionProps) => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const featured = useMemo(() => getFeaturedProjects(), []);
  const secondary = useMemo(() => projects.filter(p => !p.featured), []);

  const filteredSecondary = useMemo(() => {
    if (activeCategory === "All") return secondary;
    return secondary.filter(p => p.category === activeCategory);
  }, [activeCategory, secondary]);

  return (
    <section id="projects" className={cn("py-24 scroll-mt-24", className)}>
      {/* Featured projects */}
      <div className="px-4 max-w-7xl mx-auto mb-8">
        <ScrollReveal>
          <h2 className="section-heading">Featured Work</h2>
          <p className="text-muted-foreground max-w-2xl mb-16">
            Products and systems I have built, with real metrics and real users.
          </p>
        </ScrollReveal>
      </div>

      <div className="space-y-16 mb-32">
        {featured.map((project, i) => (
          <div
            key={project.slug}
            className="relative bg-card border border-border rounded-xl mx-4 max-w-7xl xl:mx-auto"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className={cn(
                "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center",
                i % 2 === 1 && "lg:direction-rtl"
              )}>
                {/* Text side */}
                <ScrollReveal direction={i % 2 === 0 ? "left" : "right"}>
                  <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className="bg-portfolio-blue/10 text-portfolio-blue border border-portfolio-blue/20">
                        {project.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-mono">{project.timeframe}</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold font-space-grotesk text-foreground mb-3">
                      {project.title}
                    </h3>

                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {project.summary}
                    </p>

                    {project.impactMetrics && project.impactMetrics.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {project.impactMetrics.map((metric) => (
                          <div key={metric.label}>
                            <div className="text-xl md:text-2xl font-bold font-space-grotesk text-foreground">
                              {metric.value}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                              {metric.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-md bg-black text-white">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/projects/${project.slug}`}
                        onClick={() => trackProjectOpen(project.slug)}
                        className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-portfolio-blue hover:bg-portfolio-dark-blue text-white transition-colors no-underline"
                      >
                        Read more
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      {project.links.length > 0 && (
                        <a
                          href={project.links[0].href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackOutboundLink(project.links[0].href, project.slug)}
                          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-zinc-300 text-black hover:bg-white/10 transition-colors no-underline"
                        >
                          {project.links[0].label}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </ScrollReveal>

                {/* Image side */}
                <ScrollReveal direction={i % 2 === 0 ? "right" : "left"} delay={0.15}>
                  <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                    <TiltCard intensity={5}>
                      <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-64 md:h-80 object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-background/40 backdrop-blur-sm" />
                      </div>
                    </TiltCard>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary projects */}
      <div className="px-4 max-w-7xl mx-auto">
        <ScrollReveal>
          <h2 className="section-heading">More Projects</h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap gap-2 mb-8">
            {projectCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setActiveCategory(cat.value);
                  trackProjectFilter(cat.value);
                }}
                className={cn(
                  "text-sm px-4 py-2 rounded-full border transition-colors",
                  activeCategory === cat.value
                    ? "bg-portfolio-blue text-white border-portfolio-blue"
                    : "bg-transparent text-muted-foreground border-border hover:border-portfolio-blue/50"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSecondary.map((project, i) => (
            <ScrollReveal key={project.slug} delay={i * 0.05}>
              <TiltCard intensity={4}>
                <Link
                  to={`/projects/${project.slug}`}
                  onClick={() => trackProjectOpen(project.slug)}
                  className="block bg-card border border-border rounded-xl p-6 h-full hover:border-portfolio-blue/30 transition-colors no-underline"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-portfolio-blue/10 text-portfolio-blue border border-portfolio-blue/20 text-xs">
                      {project.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{project.timeframe}</span>
                  </div>
                  <h3 className="text-base font-semibold font-space-grotesk text-foreground mb-2">
                    {project.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {project.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded bg-black text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
