import { trackEvent } from '../utils/analytics';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Github, Mail, Linkedin, ExternalLink, Phone, MapPin } from "lucide-react";

interface ContactSectionProps {
  className?: string;
}

const ContactSection = ({ className }: ContactSectionProps) => {
  return (
    <section id="contact" className={cn("section bg-white", className)}>
      <h2 className="section-heading">Get In Touch</h2>
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        <p className="text-center text-portfolio-gray mb-8">
          I'm currently open to new opportunities in data engineering and analytics. Feel free to reach out if you'd like to discuss potential collaborations or just want to connect!
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <Button variant="outline" size="lg" className="flex items-center gap-2 card-hover" asChild>
            <a href="mailto:sumitgundawar3@gmail.com" target="_blank" rel="noopener noreferrer">
              <Mail className="w-4 h-4" /> sumitgundawar3@gmail.com
            </a>
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <Button variant="outline" size="lg" className="flex items-center gap-2 card-hover" asChild>
            <a href="https://github.com/sumitgundawar" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4" /> GitHub
            </a>
          </Button>
          <Button variant="outline" size="lg" className="flex items-center gap-2 card-hover" asChild>
            <a href="https://linkedin.com/in/sumit-gundawar-759470129" target="_blank" rel="noopener noreferrer">
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
          </Button>
          <Button variant="outline" size="lg" className="flex items-center gap-2 card-hover" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <MapPin className="w-4 h-4" /> London, UK
            </a>
          </Button>
        </div>
        
        <div className="w-full border border-dashed border-gray-200 p-8 rounded-lg text-center bg-portfolio-off-white card-hover">
          <h3 className="text-xl font-semibold mb-4 font-space-grotesk text-portfolio-charcoal">Work Authorization</h3>
          <p className="text-portfolio-gray mb-6">
            Authorized to work in the UK on a Graduate visa with full-time work rights. Open to relocation for international opportunities.
          </p>
          <Button className="bg-portfolio-blue hover:bg-portfolio-dark-blue" size="lg" asChild>
            <a href="mailto:sumitgundawar3@gmail.com">
              Contact Me
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
