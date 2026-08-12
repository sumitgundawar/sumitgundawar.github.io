import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StatusPage } from "@/components/StatusPage";
import { LearnPage } from "@/components/LearnPage";
import { BuildPage } from "@/components/BuildPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StatusPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/build" element={<BuildPage />} />
      </Routes>
    </BrowserRouter>
  );
}
