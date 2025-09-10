import { createRoot } from "react-dom/client";
import React from "react";
import { logger } from "@/lib/logger";
// Session Safety: no-outbound mocks (DEV only)
import "./mocks/no-outbound";
import App from "./App";
import "./index.css";
import "./styles/enhanced-ui.css";

// DEV-only preconnect to API origin for faster first call
if (import.meta.env.DEV) {
  try {
    const origin = new URL(import.meta.env.VITE_API_BASE_URL).origin;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "";
    document.head.appendChild(link);
  } catch (e) {
    // no-op
  }

  // Lightweight Web Vitals logger (DEV only)
  try {
    if ("PerformanceObserver" in window) {
      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last: any = entries[entries.length - 1];
        logger.info("[Vitals][LCP]", { value: Math.round(last.startTime) });
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true } as any);

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any) {
          if (!(entry as any).hadRecentInput) clsValue += (entry as any).value || 0;
        }
        logger.info("[Vitals][CLS]", { value: Number(clsValue.toFixed(3)) });
      });
      clsObserver.observe({ type: "layout-shift", buffered: true } as any);

      // INP (approx) using Event Timing
      let maxEvent = 0;
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any) {
          if (entry.duration && entry.duration > maxEvent) maxEvent = entry.duration;
        }
        logger.info("[Vitals][INP]", { value: Math.round(maxEvent) });
      });
      try {
        inpObserver.observe({ type: "event", buffered: true } as any);
      } catch {
        // unsupported
      }
    }
  } catch {}
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
