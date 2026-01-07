import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { trackButtonClick } from "@/lib/analytics";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background font-inter">
      <Navbar variant="page" />
      <main className="pt-16">
        <section className="section">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold mb-4 font-space-grotesk text-foreground">404</h1>
            <p className="text-lg text-muted-foreground mb-6">
              This page doesn’t exist. If you were looking for a project, head back to the homepage.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-portfolio-blue hover:bg-portfolio-dark-blue" asChild>
                <a href="/#projects" onClick={() => trackButtonClick("notfound_view_projects")}>
                  View projects
                </a>
              </Button>
              <Button variant="outline" className="border-portfolio-blue text-portfolio-blue hover:bg-portfolio-light-blue" asChild>
                <a href="/" onClick={() => trackButtonClick("notfound_home")}>
                  Home
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
