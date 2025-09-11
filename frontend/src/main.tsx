import { createRoot } from "react-dom/client";
import React from "react";
import { logger } from "@/lib/logger";
// Session Safety: no-outbound mocks (DEV only)
import "./mocks/no-outbound";
import App from "./App";
import "./index.css";
import "./styles/enhanced-ui.css";

// Critical resource preloading
const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = '/fonts/inter.woff2';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);

  // Preconnect to external domains
  ['phiduqxcufdmgjvdipyu.supabase.co', 'fonts.googleapis.com'].forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = `https://${domain}`;
    link.crossOrigin = '';
    document.head.appendChild(link);
  });
};

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

// Initialize performance optimizations
preloadCriticalResources();

// Enhanced error boundary for root
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Root error boundary caught error:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Erreur de chargement
            </h1>
            <p className="text-gray-600 mb-6">
              Une erreur s'est produite lors du chargement de l'application.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Service Worker registration for production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      logger.info('Service Worker registered:', registration);
      
      // Update available notification
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Show update notification
              if (confirm('Une nouvelle version est disponible. Voulez-vous la charger ?')) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      logger.error('Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
