import { cn } from "@/lib/utils";
import { Award } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface AwardsSectionProps {
  className?: string;
}

const awards = [
  {
    id: 1,
    title: "Outstanding Performance Award (x2)",
    organization: "LatentView Analytics",
    year: "2021",
    description: "Won twice in the same year (Sep and Dec 2021) for delivery on PepsiCo and Hilton projects.",
  },
  {
    id: 2,
    title: "IEEE Publication",
    organization: "IEEE International Conference",
    year: "2021",
    description: "Transfer Learning on CIFAR-10, 96% accuracy.",
  },
  {
    id: 3,
    title: "Merit Scholarship",
    organization: "Vellore Institute of Technology",
    year: "2020",
    description: "Awarded for academic excellence and research contributions.",
  },
];

const AwardsSection = ({ className }: AwardsSectionProps) => {
  return (
    <section id="awards" className={cn("py-16 px-4 max-w-7xl mx-auto scroll-mt-24", className)}>
      <ScrollReveal>
        <h2 className="section-heading">Awards</h2>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {awards.map((award, i) => (
          <ScrollReveal key={award.id} delay={i * 0.1}>
            <div className="bg-card border border-border rounded-xl p-6 h-full">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-portfolio-blue" />
                <span className="text-xs font-mono text-portfolio-blue">{award.year}</span>
              </div>
              <h3 className="text-base font-semibold font-space-grotesk text-foreground mb-1">
                {award.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">{award.organization}</p>
              <p className="text-sm text-muted-foreground/80">{award.description}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

export default AwardsSection;
