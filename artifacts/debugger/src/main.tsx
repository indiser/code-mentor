import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In production the frontend and backend are on different domains.
// Set VITE_API_BASE_URL at build time to point at your deployed backend.
const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) {
  setBaseUrl(apiBase.replace(/\/+$/, ""));
}

createRoot(document.getElementById("root")!).render(<App />);
