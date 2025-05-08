
import { cn } from "@/lib/utils";
import { Briefcase } from "lucide-react";

interface ExperienceSectionProps {
  className?: string;
}

const experiences = [
  {
    id: 1,
    title: "Data Analyst | Data Engineer",
    company: "LatentView Analytics",
    location: "Chennai, TN, India",
    period: "June 2021 - June 2023",
    description: "Led ETL pipeline development and data analysis for major clients, optimizing data processes and delivering actionable insights.",
    responsibilities: [
      "Engineered a multi-layered ETL pipeline integrating data from multiple sources to support demand forecasting across 25M+ customer-product combinations",
      "Optimized data pipeline performance, reducing processing time from 13 to 8 hours by refining Spark jobs",
      "Developed complex SQL-based data models to track procurement performance, supplier compliance, and inventory trends",
      "Implemented advanced error handling and data validation mechanisms to maintain high data integrity",
      "Designed and deployed interactive Power BI dashboards enabling real-time monitoring of demand trends"
    ]
  },
  {
    id: 2,
    title: "Demand Planning Disaggregation",
    company: "PepsiCo (Client Project)",
    location: "Chennai, TN, India",
    period: "September 2021 - June 2023",
    description: "Developed comprehensive ETL solutions for PepsiCo's demand forecasting systems, resulting in significant efficiency improvements.",
    responsibilities: [
      "Engineered data pipelines integrating Azure Data Lake, Teradata, Presto, and SQL Server for demand forecasting",
      "Optimized pipeline performance reducing processing time from 13 to 8 hours through Spark job refinement",
      "Implemented error handling and data validation to maintain forecast integrity",
      "Integrated geo-location data to enhance regional demand forecasting across multiple countries",
      "Designed Power BI dashboards that contributed to $60M annual revenue impact"
    ]
  },
  {
    id: 3,
    title: "Customer Behavior Analytics",
    company: "Hilton (Client Project)",
    location: "Chennai, TN, India",
    period: "June 2022 - November 2022",
    description: "Created analytics pipelines for customer segmentation and targeted marketing initiatives resulting in significant business impact.",
    responsibilities: [
      "Engineered customer analytics pipeline analyzing 100+ behavioral features for sophisticated segmentation",
      "Developed machine learning models to analyze patterns across multiple customer dimensions",
      "Created automated workflows to integrate diverse data sources and generate actionable insights",
      "Built interactive dashboards to visualize customer segmentation patterns",
      "Achieved 26% improvement in customer retention rate and approximately $10M annual revenue increase"
    ]
  }
];

const ExperienceSection = ({ className }: ExperienceSectionProps) => {
  return (
    <section id="experience" className={cn("section bg-white", className)}>
      <h2 className="section-heading">Work Experience</h2>
      <div className="timeline-container mt-16">
        {experiences.map((exp) => (
          <div key={exp.id} className="timeline-item">
            <div className="timeline-dot"></div>
            <div className={`relative md:w-1/2 ${exp.id % 2 === 0 ? 'md:ml-auto md:pl-8' : 'md:pr-8'}`}>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow card-hover">
                <div className="mb-4 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-portfolio-light-blue flex items-center justify-center mr-3">
                    <Briefcase className="w-5 h-5 text-portfolio-blue" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-portfolio-charcoal font-space-grotesk">{exp.title}</h3>
                    <p className="text-portfolio-blue font-medium">{exp.company}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-portfolio-gray mb-4">
                  <span>{exp.location}</span>
                  <span>{exp.period}</span>
                </div>
                <p className="text-portfolio-gray mb-4">{exp.description}</p>
                <ul className="list-disc list-inside text-portfolio-gray space-y-1">
                  {exp.responsibilities.map((responsibility, index) => (
                    <li key={index} className="text-sm">{responsibility}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExperienceSection;
