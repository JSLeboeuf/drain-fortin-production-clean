/**
 * React Query Configuration
 */

import { QueryClient } from '@tanstack/react-query';

// Query Client avec cache agressif
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 secondes
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});