
import { cn } from "@/lib/utils";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ExperienceSectionProps {
  className?: string;
}

const experiences = [
  {
    id: 1,
    title: "Software Engineer & Innovation Integration",
    company: "By Dr Vali",
    location: "London, UK",
    period: "May 2025 - Present",
    description:
      "Product-focused engineer building API-driven products and strategic integrations across payments, commerce, and customer support — with ownership of contracts, docs, and production reliability.",
    responsibilities: [
      "Designed and built public-facing + admin APIs using Node.js/Express with clear separation of concerns for external consumers and internal tooling",
      "Implemented authentication and authorization (Google OAuth, token-based access, role-based permissions)",
      "Built rate-limited APIs (~5,000 req/sec/IP) with monitoring and safeguards for platform stability",
      "Designed webhook-driven workflows with retries, failure handling, and idempotency to guarantee delivery and data consistency",
      "Built and maintained integrations across Stripe, Shopify, Magento, and Intercom to keep customer/order/support data in sync",
      "Owned API documentation and onboarding guides to enable fast, low-support integrations by other engineers",
      "Acted as on-call engineer, resolving production incidents and improving observability and reliability over time"
    ]
  },
  {
    id: 2,
    title: "Data Analyst",
    company: "LatentView Analytics",
    location: "Remote",
    period: "Jun 2021 - Jun 2023",
    description:
      "Built event-driven, distributed data pipelines and forecasting systems for global enterprise clients, with strong focus on reliability and performance.",
    responsibilities: [
      "Built distributed pipelines processing 25M+ weekly records using PySpark and Azure Databricks",
      "Designed trigger-based orchestration where ingestion automatically kicked off forecasting pipelines generating 8-week demand forecasts",
      "Improved performance by optimizing large-scale jobs, reducing processing time from ~13 hours to ~8 hours",
      "Implemented validation, monitoring, and failure-handling mechanisms to protect data quality and availability",
      "Collaborated with product, business, and IT stakeholders to deliver production-ready systems"
    ]
  }
];

const ExperienceSection = ({ className }: ExperienceSectionProps) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <section id="experience" className={cn("section", className)}>
      <h2 className="section-heading">Work Experience</h2>
      <div className="timeline-container mt-16">
        {experiences.map((exp) => (
          <div key={exp.id} className="timeline-item">
            <div className="timeline-dot"></div>
            <div className={`relative md:w-1/2 ${exp.id % 2 === 0 ? 'md:ml-auto md:pl-8' : 'md:pr-8'}`}>
              <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow card-hover">
                <div className="mb-4 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-portfolio-blue/10 flex items-center justify-center mr-3 border border-portfolio-blue/20">
                    <Briefcase className="w-5 h-5 text-portfolio-blue" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground font-space-grotesk">{exp.title}</h3>
                    <p className="text-portfolio-blue font-medium">{exp.company}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mb-4">
                  <span>{exp.location}</span>
                  <span>{exp.period}</span>
                </div>
                <p className="text-muted-foreground mb-4">{exp.description}</p>

                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {(expanded[exp.id] ? exp.responsibilities : exp.responsibilities.slice(0, 3)).map((responsibility) => (
                    <li key={responsibility} className="text-sm">
                      {responsibility}
                    </li>
                  ))}
                </ul>

                {exp.responsibilities.length > 3 ? (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      className="text-portfolio-blue hover:bg-portfolio-blue/10"
                      size="sm"
                      onClick={() => setExpanded((prev) => ({ ...prev, [exp.id]: !prev[exp.id] }))}
                    >
                      {expanded[exp.id] ? "Show less" : "Show more"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExperienceSection;
