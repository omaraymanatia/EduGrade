import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { LucidePlay } from "lucide-react";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found. Cannot mount React app.");
}

document.title = "AI Grader - Educational Assessment Platform";

// Set favicon link
const favicon = document.createElement("link");
favicon.rel = "shortcut icon";
favicon.href = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%234f46e5' d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/svg%3E";
document.head.appendChild(favicon);

// Add meta description
const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content = "AI Grader - An educational platform for creating, accessing, and grading exams";
document.head.appendChild(metaDescription);

createRoot(container).render(<App />);
