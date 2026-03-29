import ScrollReveal from "@/components/ScrollReveal";
import { cn } from "@/lib/utils";

interface ImpactSectionProps {
  className?: string;
}

const techCategories = [
  {
    name: "Languages",
    items: ["JavaScript", "TypeScript", "Python", "PySpark", "SQL", "Java"],
  },
  {
    name: "Frontend",
    items: ["React", "Vite", "HTML/CSS", "Tailwind"],
  },
  {
    name: "Backend",
    items: ["Node.js", "Express.js", "REST APIs", "Webhooks", "OAuth 2.0"],
  },
  {
    name: "Integrations",
    items: ["Stripe", "Shopify", "Intercom", "Cloudinary", "Elastic Email", "Redis"],
  },
  {
    name: "Cloud & DevOps",
    items: ["Azure Databricks", "AWS", "GCP", "Docker", "CI/CD", "GitHub Actions", "Linux"],
  },
  {
    name: "Databases",
    items: ["MongoDB Atlas", "PostgreSQL", "MySQL", "DynamoDB", "Teradata"],
  },
  {
    name: "AI & Data",
    items: ["LLM Integration", "Document Indexing (RAG)", "TensorFlow", "ML Pipelines", "SAS", "PowerBI"],
  },
];

const milestones = [
  { year: "2016", label: "BSc Computer Science, Pune University" },
  { year: "2019", label: "MCA at VIT, IEEE Published (96% accuracy)" },
  { year: "2021", label: "Joined LatentView Analytics - PepsiCo, Hilton, Unilever" },
  { year: "2021", label: "Outstanding Performance Award x2" },
  { year: "2023", label: "MSc Data Science at UEL, London" },
  { year: "2024", label: "Thesis: Anomaly Detection with Deep Learning (Distinction)" },
  { year: "2025", label: "Sole Engineer at By Dr Vali" },
];

const ImpactSection = ({ className }: ImpactSectionProps) => {
  return (
    <section id="impact" className={cn("py-24 px-4 max-w-7xl mx-auto scroll-mt-24", className)}>
      {/* Tech stack */}
      <ScrollReveal>
        <h2 className="section-heading">Technical Skills</h2>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
        {techCategories.map((cat, i) => (
          <ScrollReveal key={cat.name} delay={i * 0.05}>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-portfolio-blue font-mono mb-3 uppercase tracking-wider">
                {cat.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((item) => (
                  <span
                    key={item}
                    className="text-sm px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Career timeline */}
      <ScrollReveal>
        <h2 className="section-heading">Timeline</h2>
      </ScrollReveal>

      <div className="relative">
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border" />

        {milestones.map((milestone, i) => {
          const isRight = i % 2 === 1;
          return (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="relative mb-8 last:mb-0">
                <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-portfolio-blue border-2 border-background -translate-x-1/2 mt-1.5 z-10" />

                {/* Mobile: always left-aligned with margin */}
                {/* Desktop: alternating left/right of the center line */}
                <div className={cn(
                  "ml-10 md:ml-0",
                  isRight
                    ? "md:ml-[50%] md:pl-8"
                    : "md:mr-[50%] md:pr-8 md:text-right"
                )}>
                  <span className="text-xs font-mono text-portfolio-blue">{milestone.year}</span>
                  <p className="text-sm text-muted-foreground mt-1">{milestone.label}</p>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};

export default ImpactSection;
