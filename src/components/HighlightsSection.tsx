import type React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projects, type ProjectCategory } from "@/data/projects";
import { ArrowRight, Boxes, Cpu, Network, Sparkles } from "lucide-react";

interface HighlightsSectionProps {
  className?: string;
}

const focusCards: Array<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: ProjectCategory;
}> = [
  {
    title: "API & Integrations",
    description: "Public APIs, webhooks, third-party platforms, and developer experience.",
    icon: Network,
    category: "API & Integrations",
  },
  {
    title: "Full-stack Delivery",
    description: "Ship end-to-end features: UI, backend, auth, payments, and workflows.",
    icon: Boxes,
    category: "Full-stack",
  },
  {
    title: "Systems & Reliability",
    description: "Monitoring, automation, performance tuning, and operational tooling.",
    icon: Cpu,
    category: "Systems & Reliability",
  },
  {
    title: "AI / Data Work",
    description: "Data pipelines, forecasting, and practical ML systems and evaluation.",
    icon: Sparkles,
    category: "Data Platforms",
  },
];

function setFocus(category: ProjectCategory) {
  const url = new URL(window.location.href);
  url.searchParams.set("focus", category);
  url.hash = "projects";
  window.history.replaceState({}, "", url.toString());
  document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
}

const HighlightsSection = ({ className }: HighlightsSectionProps) => {
  const metrics = useMemo(
    () => [
      { value: "13+", label: "shipped projects" },
      { value: "5k req/s", label: "rate-limited APIs" },
      { value: "25M+", label: "weekly records processed" },
      { value: "£80k", label: "revenue supported" },
    ],
    []
  );

  const projectCount = useMemo(() => projects.length, []);

  return (
    <section id="highlights" className={cn("section pt-8", className)}>
      <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
        <div className="relative px-6 sm:px-10 py-10 hero-surface">
          <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row gap-10 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  Explore
                </Badge>
                <span className="text-sm text-muted-foreground">Pick a focus area and jump into projects</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-space-grotesk tracking-tight">
                Designed for people who like to explore
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl">
                I’ve worked across product engineering, systems reliability, and data/ML. Use the focus cards to filter projects, or just browse the full set
                ({projectCount} detailed write-ups).
              </p>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {metrics.map((metric) => (
                  <Card key={metric.label} className="bg-background/50 border-border">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{metric.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-[420px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {focusCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.title} className="bg-background/60 border-border hover:bg-background/75 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                            <Icon className="h-5 w-5 text-portfolio-blue" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{card.title}</div>
                            <div className="text-sm text-muted-foreground">{card.description}</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          className="bg-portfolio-blue hover:bg-portfolio-dark-blue text-white"
                          size="sm"
                          onClick={() => setFocus(card.category)}
                        >
                          Explore
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HighlightsSection;
