
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

interface EducationSectionProps {
  className?: string;
}

const education = [
  {
    id: 1,
    degree: "Master's in Data Science",
    institution: "University of East London",
    location: "London, England, United Kingdom",
    period: "September 2023 - September 2024",
    description: "Focused on data engineering, statistical modeling, and applied machine learning (including cloud-based pipelines).",
    courses: ["Advanced ETL", "Cloud-based Data Engineering", "Statistical Modeling", "Machine Learning"],
    gpa: "GPA: 8.5",
    thesis: "Thesis: Anomaly Detection in Stock Market Data Using Deep Learning on Cloud Platforms (Distinction Grade)"
  },
  {
    id: 2,
    degree: "Master's in Computer Applications",
    institution: "Vellore Institute of Technology",
    location: "Tamil Nadu, India",
    period: "July 2019 - June 2021",
    description: "Focused on computer science fundamentals, advanced programming, and machine learning applications.",
    courses: ["Computer Vision", "Transfer Learning", "Advanced Programming", "Software Engineering"],
    gpa: "GPA: 9.26",
    thesis: "Thesis: Object Detection Using Transfer Learning on CIFAR-10 Dataset (96% Accuracy | Published in IEEE Conference)"
  },
  {
    id: 3,
    degree: "Bachelor's in Computer Science",
    institution: "Pune University",
    location: "Maharashtra, India",
    period: "June 2016 - April 2019",
    description: "Comprehensive study of computer architecture, software development, and data structures.",
    courses: ["Data Structures & Algorithms", "Operating Systems", "Computer Networks", "Robotics"],
    gpa: "GPA: 9.1",
    thesis: ""
  }
];

const EducationSection = ({ className }: EducationSectionProps) => {
  return (
    <section id="education" className={cn("section bg-muted/20", className)}>
      <h2 className="section-heading">Education</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {education.map((edu) => (
          <Card key={edu.id} className="card-hover border-t-4 border-t-portfolio-blue bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-portfolio-blue/10 border border-portfolio-blue/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-portfolio-blue" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-space-grotesk text-foreground">{edu.degree}</h3>
                <p className="text-portfolio-blue font-medium">{edu.institution}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-muted-foreground mb-3">
                <span>{edu.location}</span>
                <span>{edu.period}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{edu.gpa}</p>
              {edu.thesis && <p className="text-sm italic text-muted-foreground mb-3">{edu.thesis}</p>}
              <p className="text-muted-foreground mb-3">{edu.description}</p>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Key Courses</h4>
                <div className="flex flex-wrap gap-2">
                  {edu.courses.map((course, index) => (
                    <span key={index} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground border border-border">
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default EducationSection;
