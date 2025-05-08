
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection from "@/components/ProjectsSection";
import EducationSection from "@/components/EducationSection";
import AwardsSection from "@/components/AwardsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-portfolio-off-white font-inter">
      <Navbar />
      
      <main className="pt-16">
        <HeroSection />
        <ExperienceSection />
        <ProjectsSection />
        <EducationSection />
        <AwardsSection />
        <ContactSection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
