import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import TiltCard from "@/components/TiltCard";

interface EducationSectionProps {
  className?: string;
}

const education = [
  {
    id: 1,
    degree: "MSc Data Science",
    institution: "University of East London",
    location: "London, UK",
    period: "Sep 2023 - Sep 2024",
    gpa: "8.5/10",
    highlight: "Thesis: Anomaly Detection in Stock Market Data using Deep Learning on Cloud Platforms (Distinction)",
    extra: "Access and Participation Board Member",
  },
  {
    id: 2,
    degree: "MCA Computer Applications",
    institution: "Vellore Institute of Technology",
    location: "Tamil Nadu, India",
    period: "Jul 2019 - Jun 2021",
    gpa: "9.26/10",
    highlight: "IEEE paper: Object Detection via Transfer Learning on CIFAR-10 (96% accuracy)",
    extra: "Merit Scholarship recipient",
  },
  {
    id: 3,
    degree: "BSc Computer Science",
    institution: "Savitribai Phule Pune University",
    location: "Maharashtra, India",
    period: "Jun 2016 - Apr 2019",
    gpa: "",
    highlight: "",
    extra: "",
  },
];

const EducationSection = ({ className }: EducationSectionProps) => {
  return (
    <section id="education" className={cn("py-24 px-4 max-w-7xl mx-auto scroll-mt-24", className)}>
      <ScrollReveal>
        <h2 className="section-heading">Education</h2>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {education.map((edu, i) => (
          <ScrollReveal key={edu.id} delay={i * 0.1}>
            <TiltCard intensity={4}>
              <div className="bg-card border border-border rounded-xl p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-portfolio-blue/10 flex items-center justify-center border border-portfolio-blue/20">
                    <GraduationCap className="w-5 h-5 text-portfolio-blue" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold font-space-grotesk text-foreground">{edu.degree}</h3>
                    <p className="text-sm text-portfolio-blue">{edu.institution}</p>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground mb-4">
                  <span>{edu.location}</span>
                  <span className="font-mono">{edu.period}</span>
                </div>

                {edu.gpa && (
                  <p className="text-sm font-medium text-foreground mb-2">GPA: {edu.gpa}</p>
                )}

                {edu.highlight && (
                  <p className="text-sm text-muted-foreground mb-2">{edu.highlight}</p>
                )}

                {edu.extra && (
                  <p className="text-xs text-muted-foreground/70 mt-3">{edu.extra}</p>
                )}
              </div>
            </TiltCard>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

export default EducationSection;
