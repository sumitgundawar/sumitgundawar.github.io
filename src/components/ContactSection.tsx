import { cn, openMailto } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Github, Linkedin, Mail } from "lucide-react";
import SimpleMap from "./SimpleMap";
import LocationModal from "./LocationModal";
import { trackButtonClick, trackOutboundLink } from "@/lib/analytics";

interface ContactSectionProps {
  className?: string;
}

const ContactSection = ({ className }: ContactSectionProps) => {
  return (
    <section id="contact" className={cn("section", className)}>
      <h2 className="section-heading">Get In Touch</h2>
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        <p className="text-center text-muted-foreground mb-8">
          I’m currently open to Product Engineer / Software Engineer roles (backend or full-stack), plus platform, integrations, systems reliability, and data/ML engineering roles.
          If you’re hiring for customer-facing products with strong technical foundations, I’d love to talk.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="lg" 
            className="flex items-center gap-2 card-hover"
            onClick={() => {
              trackButtonClick("contact_email");
              openMailto("sumitgundawar3@gmail.com", "Opportunity — Product/Software Engineer");
            }}
          >
            <Mail className="w-4 h-4" /> sumitgundawar3@gmail.com
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <Button variant="outline" size="lg" className="flex items-center gap-2 card-hover" asChild>
            <a
              href="https://github.com/sumitgundawar"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackOutboundLink("https://github.com/sumitgundawar", "github_profile")}
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
          </Button>
          <Button variant="outline" size="lg" className="flex items-center gap-2 card-hover" asChild>
            <a
              href="https://linkedin.com/in/sumit-gundawar-759470129"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackOutboundLink("https://linkedin.com/in/sumit-gundawar-759470129", "linkedin_profile")}
            >
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
          </Button>
          <LocationModal />
        </div>
        
        <div className="w-full border border-dashed border-border p-8 rounded-2xl text-center bg-card/50 card-hover backdrop-blur">
          <h3 className="text-xl font-semibold mb-4 font-space-grotesk text-foreground">Work Authorization</h3>
          <p className="text-muted-foreground mb-6">
            Authorized to work in the UK on a Graduate visa with full-time work rights. Open to relocation for international opportunities.
          </p>
          <Button 
            className="bg-portfolio-blue hover:bg-portfolio-dark-blue" 
            size="lg" 
            onClick={() => {
              trackButtonClick("contact_cta");
              openMailto("sumitgundawar3@gmail.com", "Opportunity — Product/Software Engineer");
            }}
          >
            Contact Me
          </Button>
        </div>
        
        {/* London Map Section */}
        <div className="w-full mt-10">
          <h3 className="text-xl font-semibold mb-4 font-space-grotesk text-foreground text-center">Current Location</h3>
          <SimpleMap className="mb-4 h-64" />
          <p className="text-center text-muted-foreground text-sm">
            Based in London, United Kingdom
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
