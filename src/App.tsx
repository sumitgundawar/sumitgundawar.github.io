import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StatusPage } from "@/components/StatusPage";
import { LearnPage } from "@/components/LearnPage";
import { BuildPage } from "@/components/BuildPage";
import { useAnalyticsPageview } from "@/lib/hooks";

function AnalyticsListener() {
  useAnalyticsPageview();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsListener />
      <Routes>
        <Route path="/" element={<StatusPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/build" element={<BuildPage />} />
      </Routes>
    </BrowserRouter>
  );
}
