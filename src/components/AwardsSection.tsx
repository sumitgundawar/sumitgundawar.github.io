
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Award } from "lucide-react";

interface AwardsSectionProps {
  className?: string;
}

const awards = [
  {
    id: 1,
    title: "Access and Participation Student Board Member",
    organization: "University of East London",
    year: "2024",
    description: "Selected to mentor underrepresented students in tech career pathways and promote diversity in STEM education."
  },
  {
    id: 2,
    title: "Outstanding Performance Award",
    organization: "LatentView Analytics",
    year: "2021",
    description: "Recognized twice (September 2021, December 2021) for exceptional contributions to client projects and innovative data solutions."
  },
  {
    id: 3,
    title: "Merit Scholarship",
    organization: "Vellore Institute of Technology",
    year: "2020",
    description: "Awarded based on academic excellence and research contributions in computer applications and machine learning."
  },
  {
    id: 4,
    title: "Query Solving Competition Winner",
    organization: "Savitribai Phule Pune University",
    year: "2019",
    description: "Winner of the database query competition, showcasing advanced SQL knowledge and optimization techniques."
  },
  {
    id: 5,
    title: "Programming Competition Winner",
    organization: "Savitribai Phule Pune University",
    year: "2018",
    description: "First place in the university-wide programming competition, demonstrating exceptional problem-solving skills."
  }
];

const AwardsSection = ({ className }: AwardsSectionProps) => {
  return (
    <section id="awards" className={cn("section bg-muted/20", className)}>
      <h2 className="section-heading">Awards & Recognition</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {awards.map((award) => (
          <Card key={award.id} className="card-hover border-t-4 border-t-portfolio-blue bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-portfolio-blue" />
                <p className="text-sm text-portfolio-blue font-medium">{award.year}</p>
              </div>
              <h3 className="text-lg font-bold font-space-grotesk text-foreground">{award.title}</h3>
              <p className="text-sm text-muted-foreground">{award.organization}</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{award.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default AwardsSection;
