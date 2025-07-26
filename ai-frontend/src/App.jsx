import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InterviewPage from "./InterviewPage";
import HomePage from "./HomePage";
import EndPage from "./EndPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/end" element={<EndPage />} />
      </Routes>
    </Router>
  );
}
