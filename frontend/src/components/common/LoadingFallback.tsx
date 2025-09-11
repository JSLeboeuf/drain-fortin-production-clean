import { memo } from 'react';

interface LoadingFallbackProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingFallback = memo(function LoadingFallback({ 
  message = 'Chargement...', 
  size = 'lg' 
}: LoadingFallbackProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-2',
    lg: 'h-16 w-16 border-3'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div 
          className={`animate-spin rounded-full ${sizeClasses[size]} border-b-blue-600 border-t-transparent mx-auto`}
          role="status"
          aria-label="Chargement"
        />
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
        <div className="mt-2 text-xs text-gray-400">
          Optimisation en cours...
        </div>
      </div>
    </div>
  );
});

export default LoadingFallback;