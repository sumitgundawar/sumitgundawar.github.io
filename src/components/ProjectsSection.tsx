
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ArrowRight, FileText } from "lucide-react";
import { projectCategories, projects } from "@/data/projects";

interface ProjectsSectionProps {
  className?: string;
}

const ProjectsSection = ({ className }: ProjectsSectionProps) => {
  const [activeCategory, setActiveCategory] = useState<(typeof projectCategories)[number]["value"]>("All");
  const [query, setQuery] = useState("");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focus = params.get("focus");
    if (!focus) return;

    const allowed = new Set(projectCategories.map((c) => c.value));
    if (allowed.has(focus as (typeof projectCategories)[number]["value"])) {
      setActiveCategory(focus as (typeof projectCategories)[number]["value"]);
    }
  }, [location.search]);

  const visibleProjects = useMemo(() => {
    const byCategory = activeCategory === "All" ? projects : projects.filter((project) => project.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (!q) return byCategory;

    return byCategory.filter((project) => {
      const haystack = [project.title, project.summary, project.context, project.category, project.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [activeCategory, query]);

  return (
    <section id="projects" className={cn("section", className)}>
      <h2 className="section-heading">Projects</h2>
      <p className="text-muted-foreground max-w-3xl mb-8">
        A selection of the systems and products I’ve built across API platforms, integrations, full-stack apps, data/ML, and reliability work —
        written as practical “how it works” case studies.
      </p>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as typeof activeCategory)} className="w-full md:w-auto">
          <TabsList className="flex flex-wrap h-auto bg-muted border border-border">
            {projectCategories.map((category) => (
              <TabsTrigger
                key={category.value}
                value={category.value}
                className="data-[state=active]:bg-background data-[state=active]:text-portfolio-blue"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 w-full md:w-[320px]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects (e.g. Stripe, monitoring, ML)…"
            className="bg-background"
          />
          <Button
            variant="outline"
            className="border-portfolio-blue text-portfolio-blue hover:bg-portfolio-blue/10"
            onClick={() => {
              setActiveCategory("All");
              setQuery("");
              const url = new URL(window.location.href);
              url.searchParams.delete("focus");
              window.history.replaceState({}, "", url.toString());
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-8">
        Showing <span className="text-foreground font-medium">{visibleProjects.length}</span> of{" "}
        <span className="text-foreground font-medium">{projects.length}</span> projects
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {visibleProjects.map((project) => (
          <Card key={project.slug} className="overflow-hidden card-hover bg-card border-border">
            <div className="h-44 overflow-hidden relative">
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-90" />
            </div>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="font-space-grotesk text-foreground">{project.title}</CardTitle>
                <Badge variant="secondary" className="bg-portfolio-blue/10 text-portfolio-blue border border-portfolio-blue/20">
                  {project.category}
                </Badge>
              </div>
              <CardDescription className="text-muted-foreground">{project.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                <span className="font-medium text-foreground">{project.context}</span> · {project.timeframe}
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
                {project.highlights.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {project.tags.slice(0, 8).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-muted text-portfolio-blue hover:bg-muted/80 border border-border"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button size="sm" className="bg-portfolio-blue hover:bg-portfolio-dark-blue" asChild>
                <Link to={`/projects/${project.slug}`} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Read details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ProjectsSection;
