/**
 * Vite Configuration - Ultra Optimized by Isabella Chen
 * Focus: Bundle size, code splitting, performance
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // SWC for faster builds
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => ({
  plugins: [
    tsconfigPaths(),
    
    // React with SWC for 20x faster builds
    react({
      jsxRuntime: 'automatic',
    }),
    
    // PWA with optimized caching strategy
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Drain Fortin',
        short_name: 'DF Dashboard',
        theme_color: '#0066cc',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Aggressive caching for static assets
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/phiduqxcufdmgjvdipyu\.supabase\.co\/rest/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 3
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],
        skipWaiting: true,
        clientsClaim: true
      }
    }),
    
    // Brotli compression for 20-30% smaller bundles
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    }),
    
    // Gzip fallback
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false
    }),
    
    // Bundle analyzer (only in analyze mode)
    mode === 'analyze' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Direct imports for commonly used modules
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },

  // Optimized build configuration
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Aggressive code splitting
    rollupOptions: {
      output: {
        // Manual chunks for optimal caching
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'wouter'],
          
          // UI components
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-toast'
          ],
          
          // Data fetching & state
          'data-vendor': [
            '@tanstack/react-query',
            '@supabase/supabase-js',
            'zustand'
          ],
          
          // Charts (lazy loaded)
          'charts': ['recharts'],
          
          // Icons
          'icons': ['lucide-react'],
          
          // Date utilities
          'date': ['date-fns']
        },
        
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/js/${facadeModuleId}-[hash].js`;
        },
        
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        }
      },
      
      // Tree-shake unused exports
      treeshake: {
        preset: 'recommended',
        manualPureFunctions: ['console.log', 'console.info']
      }
    },
    
    // Performance budgets
    chunkSizeWarningLimit: 500,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Source maps only for errors in prod
    sourcemap: mode === 'development' ? true : 'hidden',
    
    // Asset inlining threshold
    assetsInlineLimit: 4096,
    
    // Report compressed size
    reportCompressedSize: false
  },

  // Optimized CSS processing
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *;`
      }
    },
    modules: {
      localsConvention: 'camelCaseOnly'
    },
    // Extract critical CSS
    postcss: {
      plugins: [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: (atRule) => {
              if (atRule.name === 'charset') {
                atRule.remove();
              }
            }
          }
        }
      ]
    }
  },

  // Development optimizations
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      overlay: false // Reduce HMR overhead
    },
    // Warmup frequently used modules
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/pages/Monitoring.tsx',
        './src/lib/supabase.ts'
      ]
    }
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'lucide-react'
    ],
    exclude: ['@vite/client', '@vite/env'],
    esbuildOptions: {
      target: 'es2020'
    }
  },

  // Performance hints
  performance: {
    hints: 'warning',
    maxEntrypointSize: 250000,
    maxAssetSize: 250000
  }
}));