import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getProjectBySlug } from "@/data/projects";
import { ArrowLeft, ExternalLink } from "lucide-react";

const Section = ({ title, items }: { title: string; items: string[] }) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold font-space-grotesk text-foreground mb-4">{title}</h2>
      <ul className="list-disc list-inside text-muted-foreground space-y-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const Project = () => {
  const { slug } = useParams();
  const project = slug ? getProjectBySlug(slug) : undefined;

  if (!project) {
    return (
      <div className="min-h-screen bg-background font-inter">
        <Navbar variant="page" />
        <main className="pt-16">
          <section className="section">
            <h1 className="text-3xl font-bold font-space-grotesk text-foreground mb-4">Project not found</h1>
            <p className="text-muted-foreground mb-8">The link may be outdated, or the project was moved.</p>
            <Button className="bg-portfolio-blue hover:bg-portfolio-dark-blue" asChild>
              <Link to="/#projects" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to projects
              </Link>
            </Button>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      <Navbar variant="page" />

      <main className="pt-16">
        <section className="section">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Button variant="outline" className="border-portfolio-blue text-portfolio-blue hover:bg-portfolio-light-blue" asChild>
              <Link to="/#projects" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Badge variant="secondary" className="bg-portfolio-light-blue text-portfolio-blue">
              {project.category}
            </Badge>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <h1 className="text-4xl sm:text-5xl font-bold font-space-grotesk text-foreground">{project.title}</h1>
              <p className="mt-4 text-lg text-muted-foreground">{project.summary}</p>

              <div className="mt-6 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{project.context}</span> · {project.timeframe}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-muted text-portfolio-blue hover:bg-muted/80 border border-border"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {project.confidentialityNote ? (
                <Card className="mt-8 border border-dashed border-border bg-card/50">
                  <CardContent className="p-5 text-sm text-muted-foreground">{project.confidentialityNote}</CardContent>
                </Card>
              ) : null}

              <Separator className="my-10" />

              <Section title="Highlights" items={project.highlights} />
              <Section title="What I Built" items={project.whatIBuilt} />
              <Section title="Reliability & Observability" items={project.reliabilityAndObservability} />
              <Section title="Developer Experience" items={project.developerExperience} />
              <Section title="Impact" items={project.impact} />
            </div>

            <div className="lg:col-span-2">
              <Card className="overflow-hidden bg-card border-border">
                <div className="h-56 overflow-hidden">
                  <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold font-space-grotesk text-foreground mb-3">Quick Links</h2>
                  {project.links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No public links for this work.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {project.links.map((link) => (
                        <Button key={link.href} variant="outline" className="justify-between" asChild>
                          <a href={link.href} target="_blank" rel="noopener noreferrer">
                            <span>{link.label}</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Project;
