import { cn, openMailto } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Github, Linkedin, Mail } from "lucide-react";
import { trackButtonClick, trackOutboundLink } from "@/lib/analytics";
import ScrollReveal from "@/components/ScrollReveal";
import MagneticButton from "@/components/MagneticButton";

interface ContactSectionProps {
  className?: string;
}

const ContactSection = ({ className }: ContactSectionProps) => {
  return (
    <section id="contact" className={cn("py-24 px-4 max-w-7xl mx-auto scroll-mt-24", className)}>
      <div className="max-w-2xl mx-auto text-center">
        <ScrollReveal>
          <h2 className="section-heading text-center">Get in touch</h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            I am open to software engineering roles - backend, full-stack, or anything
            where I can build products that matter. If you are hiring, I would love to talk.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <MagneticButton>
              <Button
                size="lg"
                className="bg-portfolio-blue hover:bg-portfolio-dark-blue text-white"
                onClick={() => {
                  trackButtonClick("contact_email");
                  openMailto();
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                sumitgundawar3@gmail.com
              </Button>
            </MagneticButton>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="lg" className="border-border" asChild>
              <a
                href="https://github.com/sumitgundawar"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackOutboundLink("https://github.com/sumitgundawar", "github_profile")}
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </a>
            </Button>
            <Button variant="outline" size="lg" className="border-border" asChild>
              <a
                href="https://linkedin.com/in/sumit-gundawar-759470129"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackOutboundLink("https://linkedin.com/in/sumit-gundawar-759470129", "linkedin_profile")}
              >
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </a>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ContactSection;
