import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, startTransition } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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

function AppRoutes() {
  const { user, loading } = useAuth();

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
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/crm" 
          element={
            <ProtectedRoute>
              <CRMDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/monitoring" 
          element={
            <ProtectedRoute>
              <Monitoring />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calls" 
          element={
            <ProtectedRoute>
              <Calls />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calls/:id" 
          element={
            <ProtectedRoute>
              <CallDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/test" 
          element={
            <ProtectedRoute>
              <Test />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;