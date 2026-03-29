import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "@/lib/gsap";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { trackButtonClick } from "@/lib/analytics";

const NotFound = () => {
  const numbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("404 - Someone landed on a page that does not exist.");

    const el = numbersRef.current;
    if (!el) return;

    const chars = el.querySelectorAll('.four-char');
    gsap.fromTo(chars,
      { y: 80, opacity: 0, rotateX: -90 },
      { y: 0, opacity: 1, rotateX: 0, duration: 0.8, stagger: 0.12, ease: 'back.out(1.7)' }
    );

    gsap.to(chars, {
      y: -6,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.15,
      delay: 1,
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = numbersRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

    gsap.to(el, {
      rotateY: x * 8,
      rotateX: -y * 8,
      duration: 0.5,
      ease: 'power2.out',
      transformPerspective: 600,
    });
  };

  const handleMouseLeave = () => {
    const el = numbersRef.current;
    if (!el) return;
    gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'power2.out' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background font-inter"
    >
      <Navbar variant="page" />

      <main className="pt-24 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div
          ref={numbersRef}
          className="select-none mb-8"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="flex items-center gap-2">
            {['4', '0', '4'].map((char, i) => (
              <span
                key={i}
                className="four-char text-8xl md:text-[10rem] font-bold font-space-grotesk text-foreground/10"
                style={{ display: 'inline-block' }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        <h1 className="text-2xl font-bold font-space-grotesk text-foreground mb-3 text-center">
          This page does not exist
        </h1>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          You might have followed an old link, or maybe you were just exploring. Either way, here is
          how to get back on track.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Button className="bg-portfolio-blue hover:bg-portfolio-dark-blue" asChild>
            <Link to="/" className="flex items-center gap-2" onClick={() => trackButtonClick("404_home")}>
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button variant="outline" className="border-border" asChild>
            <Link to="/#projects" className="flex items-center gap-2" onClick={() => trackButtonClick("404_projects")}>
              <ArrowLeft className="h-4 w-4" />
              View projects
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
};

export default NotFound;
