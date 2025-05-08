
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
    title: "Socio-Demographic Factors & COVID-19 Mortality",
    description: "Conducted statistical analysis using Python and R to investigate relationships between socio-demographic factors and COVID-19 mortality rates across England and Wales.",
    tags: ["Python", "R", "Statistical Analysis", "Data Visualization"],
    github: "#",
    demo: "#",
    image: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144"
  },
  {
    id: 2,
    title: "ETL Pipeline for Demand Forecasting",
    description: "Engineered a multi-layered ETL pipeline that integrated data from multiple sources to support demand forecasting across 25M+ customer-product combinations.",
    tags: ["Spark", "Azure", "SQL", "Power BI"],
    github: "#",
    demo: "#",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f"
  },
  {
    id: 3,
    title: "Customer Behavior Analytics System",
    description: "Developed an analytics pipeline analyzing 100+ behavioral features for sophisticated customer segmentation and targeted marketing.",
    tags: ["Python", "Machine Learning", "Data Processing", "Dashboard"],
    github: "#",
    demo: "#",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71"
  },
  {
    id: 4,
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
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" asChild>
                <a href={project.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <Github className="h-4 w-4" />
                  Code
                </a>
              </Button>
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
