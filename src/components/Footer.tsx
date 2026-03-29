import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { trackButtonClick } from "@/lib/analytics";

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    trackButtonClick("footer_back_to_top");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={cn("py-8 border-t border-border", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {currentYear} Sumit Gundawar
          </p>
          <button
            onClick={scrollToTop}
            className="text-sm text-white flex items-center gap-2 group bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-md transition-colors"
          >
            <span>Back to top</span>
            <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
