import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ImpactSection from "@/components/ImpactSection";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection from "@/components/ProjectsSection";
import EducationSection from "@/components/EducationSection";
import AwardsSection from "@/components/AwardsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import CustomCursor from "@/components/CustomCursor";
import ScrollAnalytics from "@/components/ScrollAnalytics";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const scrollTo = searchParams.get("scrollTo");
    if (scrollTo) {
      setSearchParams({}, { replace: true });
      const tryScroll = (attempts = 0) => {
        const el = document.getElementById(scrollTo);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else if (attempts < 20) {
          setTimeout(() => tryScroll(attempts + 1), 150);
        }
      };
      tryScroll();
    }
  }, [searchParams, setSearchParams]);

  return (
    <LoadingScreen>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen font-inter"
      >
        <div className="page-gradient" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <CustomCursor />
        <Navbar />

        <main className="relative z-10 pt-16">
          <HeroSection />
          <ImpactSection />
          <ExperienceSection />
          <ProjectsSection />
          <EducationSection />
          <AwardsSection />
          <ContactSection />
        </main>

        <Footer className="relative z-10" />
        <ScrollAnalytics />
      </motion.div>
    </LoadingScreen>
  );
};

export default Index;
