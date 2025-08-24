
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink, FileText } from "lucide-react";

interface ProjectsSectionProps {
  className?: string;
}

const projects = [
  {
    id: 1,
    title: "BDV AI Concierge ChatBot",
    description: "Built RAG-powered AI chatbot from scratch using product/service data, FAQs, and policies. Integrated with ChatGPT for intelligent query routing and brand-consistent responses.",
    tags: ["Python", "RAG", "AI/ML", "ChatGPT API", "JavaScript"],
    github: "#",
    demo: "https://bydrvali.com",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995"
  },
  {
    id: 2,
    title: "BDV FIT E-Learning Platform",
    description: "Full-stack e-learning platform with admin dashboard, course management, analytics, and certification system. Supports CPD and Level 7 courses with interactive content.",
    tags: ["Node.js", "Express", "MongoDB", "Full-Stack", "Analytics"],
    github: "#",
    demo: "https://bdvfit.com",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
  },
  {
    id: 3,
    title: "Healthcare CRM Analytics Dashboard",
    description: "Integrated CRM dashboard combining Klaviyo, Pabau, HubSpot APIs with real-time analytics. Tracks complete customer journey and business performance metrics.",
    tags: ["Python", "SQL", "Looker Studio", "API Integration", "CRM"],
    github: "#",
    demo: "#",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71"
  },
  {
    id: 4,
    title: "BDV Portal - Clinical Management System",
    description: "Internal application for clinicians to create patient records, generate treatment protocols, and manage aftercare guidelines for luxury medical aesthetics procedures.",
    tags: ["Express.js", "Node.js", "MongoDB Atlas", "Healthcare"],
    github: "#",
    demo: "https://bdvportal.com",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56"
  },
  {
    id: 5,
    title: "ETL Pipeline for Demand Forecasting",
    description: "Engineered a multi-layered ETL pipeline that integrated data from multiple sources to support demand forecasting across 25M+ customer-product combinations.",
    tags: ["Spark", "Azure", "SQL", "Power BI"],
    github: "#",
    demo: "#",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f"
  },
  {
    id: 6,
    title: "Object Detection with Transfer Learning",
    description: "Built an object detection system achieving 96% accuracy using transfer learning techniques on the CIFAR-10 dataset, published in IEEE conference.",
    tags: ["Deep Learning", "TensorFlow", "Computer Vision", "Transfer Learning"],
    github: "#",
    demo: "#",
    image: "https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1"
  },
];

const ProjectsSection = ({ className }: ProjectsSectionProps) => {
  return (
    <section id="projects" className={cn("section bg-white", className)}>
      <h2 className="section-heading">Featured Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projects.map((project) => (
          <Card key={project.id} className="overflow-hidden card-hover">
            <div className="h-48 overflow-hidden">
              <img 
                src={project.image} 
                alt={project.title} 
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
              />
            </div>
            <CardHeader>
              <CardTitle className="font-space-grotesk text-portfolio-charcoal">{project.title}</CardTitle>
              <CardDescription className="text-portfolio-gray">{project.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mt-2">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-portfolio-light-blue text-portfolio-blue hover:bg-portfolio-light-blue/80">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button size="sm" className="bg-portfolio-blue hover:bg-portfolio-dark-blue" asChild>
                <a href={project.demo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Details
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ProjectsSection;
