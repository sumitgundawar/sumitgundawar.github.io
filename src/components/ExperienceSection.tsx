import { cn } from "@/lib/utils";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import AccuracyChart from "@/components/AccuracyChart";
import { Award, ExternalLink } from "lucide-react";
import { trackOutboundLink } from "@/lib/analytics";

interface ExperienceSectionProps {
  className?: string;
}

const ExperienceSection = ({ className }: ExperienceSectionProps) => {
  return (
    <section id="experience" className={cn("py-24 px-4 max-w-7xl mx-auto scroll-mt-24", className)}>
      <ScrollReveal>
        <h2 className="section-heading">Experience</h2>
      </ScrollReveal>

      {/* Chapter 1: By Dr Vali */}
      <div className="mb-32">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-portfolio-blue font-mono mb-2">May 2025 - Present</p>
              <h3 className="text-2xl md:text-3xl font-bold font-space-grotesk text-foreground">
                By Dr Vali
              </h3>
              <p className="text-muted-foreground mt-1">Software Engineer (Sole Engineer) - London, UK</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-lg text-muted-foreground max-w-3xl mb-12 leading-relaxed">
            Sole engineer across 13+ shipped products, owning everything from product design
            and backend development to production deployment and ongoing support.
          </p>
        </ScrollReveal>

        {/* Products grid */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold font-space-grotesk text-foreground">bdvfit.com</h4>
                <a
                  href="https://bdvfit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackOutboundLink("https://bdvfit.com", "bdvfit_experience")}
                  className="text-muted-foreground hover:text-portfolio-blue transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-sm text-portfolio-blue font-medium mb-2">Online Learning Platform</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Full-stack CPD-accredited platform for doctors and dentists. 25+ screens, 20+ API modules,
                video lessons, quizzes, Stripe payments, automated certificates, and an 18-page admin panel.
                Built solo from scratch in 6 months.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["React", "Node.js", "TypeScript", "MongoDB"].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold font-space-grotesk text-foreground">bydrvali.com</h4>
                <a
                  href="https://bydrvali.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackOutboundLink("https://bydrvali.com", "bydrvali_experience")}
                  className="text-muted-foreground hover:text-portfolio-blue transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-sm text-portfolio-blue font-medium mb-2">E-commerce Store</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                E-commerce store for 5 skin care products that has generated over £500k in revenue
                since July 2025.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Shopify", "Stripe", "Integrations"].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="text-lg font-semibold font-space-grotesk text-foreground mb-3">bdvportal.com</h4>
              <p className="text-sm text-portfolio-blue font-medium mb-2">Clinic Management System</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Personalised treatment protocols across 120+ services for a high-profile client base
                including celebrities.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["React", "Node.js", "MongoDB", "REST APIs"].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="text-lg font-semibold font-space-grotesk text-foreground mb-3">AI Chatbots + Project Tracker</h4>
              <p className="text-sm text-portfolio-blue font-medium mb-2">Internal Tools</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built bydrvaliportal.com, an internal project tracker with team management, automated
                approval workflows, and real-time reporting for the CEO. Developed AI chatbots for the
                legal team using document indexing and retrieval.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["RAG", "LLM", "Node.js", "Workflows"].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Chapter 2: LatentView Analytics */}
      <div>
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-portfolio-blue font-mono mb-2">Jun 2021 - Jun 2023</p>
              <h3 className="text-2xl md:text-3xl font-bold font-space-grotesk text-foreground">
                LatentView Analytics
              </h3>
              <p className="text-muted-foreground mt-1">Data Analyst (Clients: PepsiCo, Hilton, Unilever) - Remote</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-lg text-muted-foreground max-w-3xl mb-12 leading-relaxed">
            Built demand forecasting models and analytics systems for global enterprise clients,
            with direct impact on supply chain operations and revenue.
          </p>
        </ScrollReveal>

        {/* PepsiCo section with chart */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="text-lg font-semibold font-space-grotesk text-foreground mb-2">
                PepsiCo Demand Forecasting
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Built a custom demand forecasting model at the most granular level - store by product,
                8 weeks ahead. Improved forecast accuracy from 51% to 83% with a bias of +/-6%.
                The model was used directly by PepsiCo's Supply Chain Director.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <AnimatedCounter
                  target={200}
                  prefix="£"
                  suffix="M+"
                  label="Annual impact"
                  className="text-left"
                />
                <AnimatedCounter
                  target={32}
                  suffix="%"
                  label="Accuracy gain"
                  sublabel="51% to 83%"
                  className="text-left"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["SAS", "Azure Databricks", "Teradata", "PowerBI"].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                Forecast Accuracy Over Time
              </h4>
              <AccuracyChart />
            </div>
          </div>
        </ScrollReveal>

        {/* Warehouse + Awards */}
        <ScrollReveal delay={0.15}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="text-lg font-semibold font-space-grotesk text-foreground mb-2">
                Warehouse Picker Accuracy
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Delivered a warehouse picker accuracy system tracking per-hour and per-day performance
                across US operations.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <AnimatedCounter
                  target={13}
                  suffix="%"
                  label="Accuracy gain"
                  className="text-left"
                />
                <AnimatedCounter
                  target={60}
                  prefix="£"
                  suffix="k"
                  label="Revenue per warehouse"
                  className="text-left"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Python", "Azure", "PowerBI"].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-portfolio-blue/10 flex items-center justify-center border border-portfolio-blue/20">
                  <Award className="w-5 h-5 text-portfolio-blue" />
                </div>
                <h4 className="text-lg font-semibold font-space-grotesk text-foreground">
                  Outstanding Performance Award
                </h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Won the Outstanding Performance Award twice in the same year (Sep and Dec 2021)
                for delivery on PepsiCo and Hilton projects.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ExperienceSection;
