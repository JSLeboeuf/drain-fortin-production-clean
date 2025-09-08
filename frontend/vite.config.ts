import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// Static vendor split: react, react-dom, wouter, @tanstack/react-query
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiBase = env.VITE_API_BASE_URL || "http://localhost:8080";

  return {
    plugins: [
      react(),
      // Bundle size visualization (only in build mode)
      mode === 'production' && visualizer({
        filename: './dist/bundle-stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Visual representation
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    // Dev proxy: forwards /api to backend origin to avoid CORS during local dev
    server: {
      headers: {
        // Headers de sécurité pour le développement
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Dev needs unsafe-eval for HMR
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' ws: wss: http://localhost:* https://localhost:*",
          "img-src 'self' data: https:",
          "font-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests"
        ].join('; ')
      },
      proxy: {
        "/api": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
          // keep path as-is (/api -> /api)
        },
      },
    },
    build: {
      // Optimisations de sécurité pour la production
      sourcemap: mode === 'development', // Source maps uniquement en dev
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Supprimer console.* en prod
          drop_debugger: true,
        },
        mangle: {
          safari10: true, // Compatibilité Safari
        },
      },
      rollupOptions: {
        output: {
          // Sécurité: noms de chunks randomisés en production
          entryFileNames: mode === 'production' 
            ? 'assets/[name]-[hash].js' 
            : 'assets/[name].js',
          chunkFileNames: mode === 'production'
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          assetFileNames: mode === 'production'
            ? 'assets/[name]-[hash].[ext]'
            : 'assets/[name].[ext]',
          // Laisser Vite gérer automatiquement le code splitting
          // pour éviter les chunks vides
        },
        // Optimisations supplémentaires
        treeshake: {
          moduleSideEffects: false,
          preset: 'smallest',
        },
      },
      // Sécurité: définir les limites pour éviter les attaques
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096, // 4KB limite pour l'inlining
    },
  };
});
