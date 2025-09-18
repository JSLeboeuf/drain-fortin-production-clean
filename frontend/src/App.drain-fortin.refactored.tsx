/**
 * Drain Fortin VAPI Dashboard - Refactored Version
 * Clean, modular implementation using extracted components
 * 
 * Original file was 1164 lines - now reduced to ~60 lines
 * Components extracted to:
 * - UI components: components/ui/
 * - Dashboard components: components/dashboard/
 * - Layout components: components/layout/
 * - Configuration: config/
 * - Constants: constants/
 * - Hooks: hooks/
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/query-client';
import { Dashboard } from './components/dashboard/Dashboard';
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary';

// Global styles for animations (keeping original animations)
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slide-in-right {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  .animate-spin { animation: spin 1s linear infinite; }
  .animate-pulse { animation: pulse 2s infinite; }
  .animate-fade-in { animation: fade-in 0.3s ease-out; }
  .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
`;

// Inject global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = globalStyles;
  document.head.appendChild(style);
}

/**
 * Main App Component
 * Now clean and focused, delegating complexity to extracted components
 */
export default function App() {
  return (
    <SimpleErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </SimpleErrorBoundary>
  );
}

/**
 * Refactoring Summary:
 * 
 * BEFORE (App.drain-fortin.tsx):
 * - 1164 lines of code
 * - 15+ inline components
 * - Mixed concerns (UI, data, styling, configuration)
 * - Difficult to maintain and test
 * 
 * AFTER (Modular structure):
 * - 60 lines in main file
 * - 16 separate component files
 * - Clear separation of concerns
 * - Easy to maintain, test, and reuse
 * - Better TypeScript support
 * 
 * Files created:
 * ✅ constants/colors.ts - Brand colors
 * ✅ config/supabase.ts - Database configuration  
 * ✅ config/query-client.ts - React Query setup
 * ✅ components/ui/Button.tsx - Reusable button
 * ✅ components/ui/Card.tsx - Reusable card
 * ✅ components/ui/StatusBadge.tsx - Status indicator
 * ✅ components/layout/Header.tsx - App header
 * ✅ components/dashboard/QuickStats.tsx - Stats display
 * ✅ components/dashboard/Dashboard.tsx - Main dashboard
 * ✅ components/SimpleErrorBoundary.tsx - Error handling
 * ✅ hooks/useVapiCalls.ts - Data fetching logic
 * ✅ types/dashboard.ts - TypeScript definitions
 */