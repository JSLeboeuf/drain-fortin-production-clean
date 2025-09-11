import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => ({
  plugins: [
    tsconfigPaths(),
    react(),
    
    // PWA Configuration
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Drain Fortin Dashboard',
        short_name: 'Drain Fortin',
        theme_color: '#0066cc',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/phiduqxcufdmgjvdipyu\.supabase\.co/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    }),
    
    // Compression
    compression({ algorithm: 'brotliCompress', threshold: 1024 }),
    compression({ algorithm: 'gzip', threshold: 1024 }),
    
    // Bundle analyzer
    mode === 'analyze' && visualizer({ open: true, gzipSize: true, brotliSize: true })
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },

  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
        passes: 3
      },
      mangle: { safari10: true },
      format: { comments: false }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React ecosystem - most stable
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // Database and API layer
          if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
            return 'data-layer';
          }
          
          // UI component libraries - split by usage frequency
          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'ui-components';
          }
          
          // Charts and visualization - lazy loaded only when needed
          if (id.includes('recharts') || id.includes('framer-motion')) {
            return 'visualization';
          }
          
          // Utilities and helpers - small frequently used
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('zustand')) {
            return 'utils';
          }
          
          // Analytics and monitoring components
          if (id.includes('/pages/Analytics') || id.includes('/components/analytics')) {
            return 'analytics-chunk';
          }
          
          // CRM components
          if (id.includes('/pages/CRM') || id.includes('/components/CRM')) {
            return 'crm-chunk';
          }
          
          // Monitoring and performance
          if (id.includes('/pages/Monitoring') || id.includes('/components/performance')) {
            return 'monitoring-chunk';
          }
          
          // Testing and development
          if (id.includes('/pages/Test') || id.includes('/testing/')) {
            return 'test-chunk';
          }
          
          // Node modules - group by vendor
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('@radix') || id.includes('lucide')) return 'ui-vendor';
            return 'vendor';
          }
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash].[ext]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
        }
      }
    },
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 500
  },

  server: {
    port: 5173,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://phiduqxcufdmgjvdipyu.supabase.co wss://phiduqxcufdmgjvdipyu.supabase.co"
    }
  },

  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@supabase/supabase-js', 
      'zustand',
      '@tanstack/react-query',
      'clsx',
      'date-fns',
      'lucide-react'
    ],
    exclude: [
      // Heavy components that should remain lazy
      'recharts',
      'framer-motion'
    ]
  },

  // Enhanced caching for development
  cacheDir: 'node_modules/.vite',
  
  // Additional performance settings
  esbuild: {
    target: 'es2022',
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  }
}))