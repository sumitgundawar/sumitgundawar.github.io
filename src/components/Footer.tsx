
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  const currentYear = new Date().getFullYear();
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  
  return (
    <footer className={cn("py-8 bg-portfolio-blue/10", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-portfolio-gray">
            © {currentYear} Sumit Gundawar. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={scrollToTop} 
              className="text-sm text-portfolio-blue hover:text-portfolio-dark-blue transition-colors flex items-center gap-1 group"
            >
              <span>Back to top</span>
              <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
