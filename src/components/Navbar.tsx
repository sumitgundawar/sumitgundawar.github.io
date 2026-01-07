
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { trackNavClick } from "@/lib/analytics";

interface NavbarProps {
  className?: string;
  variant?: "home" | "page";
}

const Navbar = ({ className, variant = "home" }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      setScrollProgress(height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = useMemo(() => {
    if (variant === "page") {
      return [
        { name: "About", href: "/#about" },
        { name: "Experience", href: "/#experience" },
        { name: "Projects", href: "/#projects" },
        { name: "Contact", href: "/#contact" },
      ];
    }

    return [
      { name: "About", href: "#about" },
      { name: "Experience", href: "#experience" },
      { name: "Projects", href: "#projects" },
      { name: "Education", href: "#education" },
      { name: "Awards", href: "#awards" },
      { name: "Contact", href: "#contact" },
    ];
  }, [variant]);

  return (
    <nav 
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled ? "bg-background/70 backdrop-blur-xl border-b border-border" : "bg-transparent",
        className
      )}
    >
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-portfolio-blue/70"
        style={{ width: `${scrollProgress * 100}%` }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:py-6">
          <a href={variant === "page" ? "/" : "#about"} className="flex items-center">
            <span className="text-xl font-bold text-portfolio-blue tracking-tight">Sumit Gundawar</span>
          </a>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 rounded-md text-foreground hover:bg-muted"
              onClick={() => {
                trackNavClick(mobileMenuOpen ? "mobile_menu_close" : "mobile_menu_open");
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              aria-label="Toggle navigation"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => trackNavClick(link.name)}
              >
                {link.name}
              </a>
            ))}
            <div className="pl-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${mobileMenuOpen ? "block" : "hidden"} bg-background border-b border-border`}>
        <div className="px-4 py-3 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="block text-base font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                trackNavClick(`mobile_${link.name}`);
                setMobileMenuOpen(false);
              }}
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
