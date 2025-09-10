import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // React with SWC for faster builds
    react({
      jsxImportSource: '@emotion/react',
      plugins: [
        ['@swc/plugin-emotion', {}]
      ]
    }),
    
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    }),
    
    // Gzip compression as fallback
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false
    }),
    
    // PWA Support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Drain Fortin Dashboard',
        short_name: 'Drain Fortin',
        description: 'Dashboard professionnel pour gestion d\'appels',
        theme_color: '#0066cc',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/phiduqxcufdmgjvdipyu\.supabase\.co\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    }),
    
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@mobile': path.resolve(__dirname, './src/components/mobile')
    }
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js'
    ],
    exclude: ['@vite/client', '@vite/env']
  },

  build: {
    // Target modern browsers only
    target: 'es2020',
    
    // Optimize output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 3,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        unused: true
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false,
        ascii_only: true
      }
    },
    
    // Increase chunk size warning limit slightly
    chunkSizeWarningLimit: 600,
    
    // Enable source maps for debugging
    sourcemap: false, // Disable in production for smaller size
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Asset inlining threshold
    assetsInlineLimit: 4096,
    
    // Rollup options for advanced splitting
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false
      },
      
      output: {
        // Manual chunks for better caching
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase-vendor';
          }
          
          // UI libraries
          if (id.includes('framer-motion') || 
              id.includes('@radix-ui') ||
              id.includes('class-variance-authority') ||
              id.includes('tailwind-merge')) {
            return 'ui-vendor';
          }
          
          // Utils
          if (id.includes('date-fns') || 
              id.includes('clsx') ||
              id.includes('zod')) {
            return 'utils-vendor';
          }
          
          // Mobile components
          if (id.includes('/mobile/')) {
            return 'mobile-components';
          }
          
          // Dashboard components
          if (id.includes('/dashboard/')) {
            return 'dashboard-components';
          }
        },
        
        // Asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          
          if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        },
        
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-${facadeModuleId}-[hash].js`;
        },
        
        entryFileNames: 'js/[name]-[hash].js',
        
        // Compact output
        compact: true,
        
        // Generate smaller output
        generatedCode: {
          preset: 'es2015',
          arrowFunctions: true,
          constBindings: true,
          objectShorthand: true,
          symbols: false
        }
      }
    }
  },

  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[hash:base64:5]'
    },
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
        require('cssnano')({
          preset: ['advanced', {
            discardComments: { removeAll: true },
            reduceIdents: true,
            mergeIdents: true,
            mergeRules: true,
            minifySelectors: true,
            minifyParams: true,
            minifyFontValues: true,
            minifyGradients: true,
            normalizeWhitespace: true,
            convertValues: true,
            colormin: true,
            calc: true,
            orderedValues: true,
            minifyUrls: true,
            discardOverridden: true,
            discardDuplicates: true,
            discardEmpty: true,
            uniqueSelectors: true,
            mergeLonghand: true,
            zindex: true
          }]
        })
      ]
    }
  },

  // Server configuration
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    cors: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://phiduqxcufdmgjvdipyu.supabase.co wss://phiduqxcufdmgjvdipyu.supabase.co"
    }
  },

  // Preview server configuration  
  preview: {
    port: 4173,
    strictPort: false,
    open: false,
    cors: true,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  }
});