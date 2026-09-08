import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installDemoNetworkGuard } from "@/lib/demoNetworkGuard";

// Demo build: block any outbound request to live integration hosts.
installDemoNetworkGuard();

createRoot(document.getElementById("root")!).render(<App />);
