/**
 * Main Application Entry Point
 * Refactored version using extracted components and configuration
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/query-client';
import { Dashboard } from './components/dashboard/Dashboard';
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary';

export default function App() {
  return (
    <SimpleErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </SimpleErrorBoundary>
  );
}