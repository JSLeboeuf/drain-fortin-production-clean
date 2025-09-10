/**
 * Ultra-Optimized Dashboard App by Isabella Chen
 * Performance-First Architecture with Smart Loading
 */

import { lazy, Suspense, startTransition, useCallback, memo } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Activity, BarChart3, Users } from 'lucide-react';

// ============= PERFORMANCE CRITICAL ZONE =============
// Aggressive code splitting with intersection observer loading
const Monitoring = lazy(() => 
  import(/* webpackChunkName: "monitoring", webpackPrefetch: true */ './pages/Monitoring')
);

const Analytics = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './pages/Analytics')
);

const CRM = lazy(() => 
  import(/* webpackChunkName: "crm" */ './pages/CRM')
);

// Lazy load dev tools only in development
const ReactQueryDevtools = import.meta.env.DEV 
  ? lazy(() => 
      import('@tanstack/react-query-devtools').then(m => ({ 
        default: m.ReactQueryDevtools 
      }))
    )
  : () => null;

const PerformanceOverlay = import.meta.env.DEV
  ? lazy(() => import('./components/performance/PerformanceOverlay'))
  : () => null;

// ============= OPTIMIZED COMPONENTS =============

// Ultra-light loading component with CSS animation
const PageLoader = memo(() => (
  <div className="flex h-[calc(100vh-64px)] items-center justify-center">
    <div className="relative">
      <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
      <div className="absolute top-0 h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
    </div>
  </div>
));

// Memoized navigation with smart prefetching
const Navigation = memo(() => {
  const [location] = useLocation();
  
  // Smart prefetch on hover with priority
  const prefetchRoute = useCallback((route: string, priority: 'high' | 'low' = 'low') => {
    startTransition(() => {
      const prefetchMap = {
        'monitoring': () => {
          import('./pages/Monitoring');
          if (priority === 'high') {
            import('./hooks/useWebSocket');
            import('./components/dashboard/MetricsCard');
          }
        },
        'analytics': () => {
          import('./pages/Analytics');
          if (priority === 'high') {
            import('./components/analytics/CallsChart');
            import('recharts');
          }
        },
        'crm': () => {
          import('./pages/CRM');
          if (priority === 'high') {
            import('./components/CRM/CRMDashboard');
          }
        }
      };
      
      const fn = prefetchMap[route as keyof typeof prefetchMap];
      if (fn) fn();
    });
  }, []);

  // Active route detection for styling
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: '/', label: 'Monitoring', icon: Activity, key: 'monitoring' },
    { path: '/analytics', label: 'Analytics', icon: BarChart3, key: 'analytics' },
    { path: '/crm', label: 'CRM', icon: Users, key: 'crm' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-40 backdrop-blur-lg bg-white/95">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo with performance optimized rendering */}
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
              Drain Fortin
            </h1>
          </div>

          {/* Navigation with mobile optimization */}
          <nav className="flex gap-1" role="navigation" aria-label="Main">
            {navItems.map(({ path, label, icon: Icon, key }) => (
              <Link
                key={path}
                href={path}
                onMouseEnter={() => prefetchRoute(key, 'low')}
                onFocus={() => prefetchRoute(key, 'high')}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  transition-all duration-200 transform
                  ${isActive(path) 
                    ? 'bg-blue-50 text-blue-600 shadow-sm scale-105' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                `}
                aria-current={isActive(path) ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium hidden sm:block">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

// ============= MAIN APP WITH PERFORMANCE OPTIMIZATIONS =============
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Main Layout with CSS containment */}
        <div 
          className="min-h-screen bg-gray-50"
          style={{ contain: 'layout style' }}
        >
          <Navigation />
          
          {/* Main content with route-based code splitting */}
          <main 
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6"
            style={{ contain: 'layout' }}
          >
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={Monitoring} />
                <Route path="/analytics" component={Analytics} />
                <Route path="/crm" component={CRM} />
                
                {/* 404 with minimal bundle impact */}
                <Route>
                  <div className="flex h-[60vh] items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Page introuvable
                      </h1>
                      <p className="text-gray-600 mb-6">
                        Cette page n'existe pas.
                      </p>
                      <Link 
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <Activity className="h-4 w-4" />
                        Retour au Monitoring
                      </Link>
                    </div>
                  </div>
                </Route>
              </Switch>
            </Suspense>
          </main>
        </div>

        {/* Dev tools lazy loaded */}
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
            <PerformanceOverlay />
          </Suspense>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;