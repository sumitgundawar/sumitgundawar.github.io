import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getProjectBySlug, projects } from "@/data/projects";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { trackButtonClick, trackOutboundLink, trackProjectNavigation } from "@/lib/analytics";


const Section = ({ title, items }: { title: string; items: string[] }) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold font-space-grotesk text-foreground mb-3">{title}</h2>
      <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed">{item}</li>
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
      <div className="min-h-screen font-inter">
        <div className="page-gradient" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <Navbar variant="page" />
        <main className="relative z-10 pt-24">
          <section className="section">
            <h1 className="text-3xl font-bold font-space-grotesk text-foreground mb-4">Project not found</h1>
            <p className="text-muted-foreground mb-8">The link may be outdated, or the project was moved.</p>
            <Button className="bg-portfolio-blue hover:bg-portfolio-dark-blue" asChild>
              <Link to="/#projects" className="flex items-center gap-2" onClick={() => trackButtonClick("project_notfound_back")}>
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

  const navigate = useNavigate();
  const currentIndex = projects.findIndex(p => p.slug === project.slug);
  const prevProject = currentIndex > 0 ? projects[currentIndex - 1] : null;
  const nextProject = currentIndex < projects.length - 1 ? projects[currentIndex + 1] : null;

  const goToProjects = () => {
    trackButtonClick(`project_back_${project.slug}`);
    navigate("/?scrollTo=projects");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen font-inter"
    >
      <div className="page-gradient" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <Navbar variant="page" />

      <main className="relative z-10 pt-24">
        <section className="section overflow-hidden">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
              <button
                onClick={goToProjects}
                className="flex items-center gap-2 text-sm text-white bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-md transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                All projects
              </button>
              <Badge className="bg-portfolio-blue/10 text-portfolio-blue border border-portfolio-blue/20">
                {project.category}
              </Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 overflow-hidden">
              <div className="xl:col-span-3">
                <h1 className="text-3xl sm:text-4xl font-bold font-space-grotesk text-foreground">{project.title}</h1>
                <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{project.summary}</p>

                <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{project.context}</span>
                  <span className="text-border">|</span>
                  <span className="font-mono">{project.timeframe}</span>
                  {project.role && (
                    <>
                      <span className="text-border">|</span>
                      <span>{project.role}</span>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-md bg-white text-black">
                      {tag}
                    </span>
                  ))}
                </div>

                {project.impactMetrics && project.impactMetrics.length > 0 && (
                  <div className="mt-6 grid grid-cols-3 gap-4 p-5 bg-card border border-border rounded-xl">
                    {project.impactMetrics.map((metric) => (
                      <div key={metric.label}>
                        <div className="text-2xl font-bold font-space-grotesk text-foreground">{metric.value}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {project.confidentialityNote && (
                  <div className="mt-4 p-4 border border-dashed border-border rounded-lg bg-card/50">
                    <p className="text-sm text-muted-foreground">{project.confidentialityNote}</p>
                  </div>
                )}

                <Separator className="my-6" />

                <Section title="Highlights" items={project.highlights} />
                <Section title="What I Built" items={project.whatIBuilt} />
                <Section title="Impact" items={project.impact} />
              </div>

              <div className="xl:col-span-2">
                <div className="xl:sticky xl:top-28 space-y-4">
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={project.image} alt={project.title} className="w-full h-56 object-cover" />
                  </div>

                  {project.links.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-5">
                      <h3 className="text-sm font-medium text-foreground mb-3">Links</h3>
                      <div className="flex flex-col gap-2">
                        {project.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackOutboundLink(link.href, `project_link_${project.slug}`)}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md bg-white text-black hover:bg-zinc-100 text-sm no-underline transition-colors"
                          >
                            <span className="truncate">{link.label}</span>
                            <ExternalLink className="h-4 w-4 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation between projects */}
            <Separator className="my-10" />
            <div className="flex justify-between items-center">
              {prevProject ? (
                <Link
                  to={`/projects/${prevProject.slug}`}
                  className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors no-underline"
                  onClick={() => trackProjectNavigation(project.slug, prevProject.slug)}
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <div>
                    <div className="text-xs uppercase tracking-wider">Previous</div>
                    <div className="text-sm font-medium">{prevProject.title}</div>
                  </div>
                </Link>
              ) : <div />}
              {nextProject ? (
                <Link
                  to={`/projects/${nextProject.slug}`}
                  className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-right no-underline"
                  onClick={() => trackProjectNavigation(project.slug, nextProject.slug)}
                >
                  <div>
                    <div className="text-xs uppercase tracking-wider">Next</div>
                    <div className="text-sm font-medium">{nextProject.title}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : <div />}
            </div>
        </section>
      </main>

      <Footer />
    </motion.div>
  );
};

export default Project;
