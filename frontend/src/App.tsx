import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy, startTransition } from 'react';
import { supabase } from './lib/supabase';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';

// Lazy load heavy components with strategic prefetching
const Dashboard = lazy(() => {
  // Preload related components in background
  startTransition(() => {
    import('./pages/Analytics');
    import('./components/CRM/CRMDashboard');
  });
  return import('./components/Dashboard');
});

const Login = lazy(() => import('./components/Login'));

// Critical path components (analytics, CRM views) with intelligent preloading
const Analytics = lazy(() => {
  startTransition(() => {
    import('./components/analytics/CallsChart');
    import('./lib/services');
  });
  return import('./pages/Analytics');
});

const CRMDashboard = lazy(() => {
  startTransition(() => {
    import('./components/CRM/ClientsView');
    import('./hooks/useWebSocket');
  });
  return import('./components/CRM/CRMDashboard');
});

const Monitoring = lazy(() => {
  startTransition(() => {
    import('./hooks/useWebSocket');
    import('./components/performance/PerformanceMonitor');
  });
  return import('./pages/Monitoring');
});

const Calls = lazy(() => import('./pages/Calls'));
const CallDetail = lazy(() => import('./pages/CallDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const Test = lazy(() => import('./pages/Test'));

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route 
              path="/login" 
              element={!session ? <Login /> : <Navigate to="/" />} 
            />
            <Route 
              path="/" 
              element={session ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/analytics" 
              element={session ? <Analytics /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/crm" 
              element={session ? <CRMDashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/monitoring" 
              element={session ? <Monitoring /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/calls" 
              element={session ? <Calls /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/calls/:id" 
              element={session ? <CallDetail /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/settings" 
              element={session ? <Settings /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/test" 
              element={session ? <Test /> : <Navigate to="/login" />} 
            />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;