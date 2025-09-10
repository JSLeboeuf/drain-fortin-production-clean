import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Loader2,
  CheckCheck,
  Send,
  Upload,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading Button avec états multiples
export const LoadingButton = ({
  children,
  isLoading,
  loadingText = 'Chargement...',
  className,
  onClick,
  disabled,
  variant = 'default',
  ...props
}: {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'success' | 'danger' | 'outline';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    success: 'bg-green-500 text-white hover:bg-green-600',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };

  return (
    <motion.button
      whileHover={!isLoading && !disabled ? { scale: 1.02 } : {}}
      whileTap={!isLoading && !disabled ? { scale: 0.98 } : {}}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all',
        'disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        variants[variant],
        className
      )}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// État de succès avec animation
export const SuccessState = ({
  message,
  onClose,
  autoClose = true,
  duration = 3000,
}: {
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      </motion.div>
      <span className="text-green-800 dark:text-green-200 flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
        >
          ×
        </button>
      )}
    </motion.div>
  );
};

// État d'erreur avec animation
export const ErrorState = ({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
  >
    <motion.div
      animate={{ rotate: [0, -10, 10, -10, 0] }}
      transition={{ duration: 0.5 }}
    >
      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
    </motion.div>
    <div className="flex-1">
      <p className="text-red-800 dark:text-red-200">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 underline"
        >
          Réessayer
        </button>
      )}
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
      >
        ×
      </button>
    )}
  </motion.div>
);

// Loading overlay pour les sections
export const LoadingOverlay = ({
  isLoading,
  message = 'Chargement...',
  fullScreen = false,
}: {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}) => (
  <AnimatePresence>
    {isLoading && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center',
          fullScreen && 'fixed'
        )}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center gap-4"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-primary/20 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
            />
          </div>
          <p className="text-muted-foreground">{message}</p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Progress Steps avec animations
export const ProgressSteps = ({
  steps,
  currentStep,
  className,
}: {
  steps: { label: string; description?: string }[];
  currentStep: number;
  className?: string;
}) => (
  <div className={cn('flex items-center justify-between', className)}>
    {steps.map((step, index) => {
      const isActive = index === currentStep;
      const isCompleted = index < currentStep;

      return (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isCompleted && !isActive && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCheck className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
            <div className="mt-2 text-center">
              <p className={cn(
                'text-sm font-medium',
                isActive && 'text-primary',
                !isActive && 'text-muted-foreground'
              )}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 mx-4">
              <div className="h-1 bg-muted relative overflow-hidden rounded-full">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: index < currentStep ? '100%' : '0%' 
                  }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// Empty State avec animation
export const EmptyState = ({
  icon: Icon = Info,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="flex flex-col items-center justify-center p-12 text-center"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
      className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4"
    >
      <Icon className="h-10 w-10 text-muted-foreground" />
    </motion.div>
    <motion.h3
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-lg font-semibold mb-2"
    >
      {title}
    </motion.h3>
    {description && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground mb-6 max-w-sm"
      >
        {description}
      </motion.p>
    )}
    {action && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <LoadingButton onClick={action.onClick} variant="default">
          {action.label}
        </LoadingButton>
      </motion.div>
    )}
  </motion.div>
);

// Upload Progress
export const UploadProgress = ({
  fileName,
  progress,
  status = 'uploading',
}: {
  fileName: string;
  progress: number;
  status?: 'uploading' | 'success' | 'error';
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 bg-card border rounded-lg"
  >
    <div className="flex items-center gap-3 mb-2">
      {status === 'uploading' && <Upload className="h-5 w-5 text-primary animate-pulse" />}
      {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
      {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
      <span className="text-sm font-medium flex-1 truncate">{fileName}</span>
      <span className="text-sm text-muted-foreground">{progress}%</span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        className={cn(
          'h-full rounded-full',
          status === 'success' && 'bg-green-500',
          status === 'error' && 'bg-red-500',
          status === 'uploading' && 'bg-primary'
        )}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  </motion.div>
);

// Confirmation Dialog
export const ConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning',
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}) => {
  const icons = {
    warning: AlertCircle,
    danger: XCircle,
    info: Info,
  };
  const Icon = icons[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-lg shadow-xl z-50 max-w-md w-full p-6"
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                'p-2 rounded-full',
                type === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/20',
                type === 'danger' && 'bg-red-100 dark:bg-red-900/20',
                type === 'info' && 'bg-blue-100 dark:bg-blue-900/20'
              )}>
                <Icon className={cn(
                  'h-6 w-6',
                  type === 'warning' && 'text-yellow-600 dark:text-yellow-400',
                  type === 'danger' && 'text-red-600 dark:text-red-400',
                  type === 'info' && 'text-blue-600 dark:text-blue-400'
                )} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground">{message}</p>
                <div className="flex gap-3 mt-6">
                  <LoadingButton
                    onClick={onConfirm}
                    variant={type === 'danger' ? 'danger' : 'default'}
                    className="flex-1"
                  >
                    {confirmText}
                  </LoadingButton>
                  <LoadingButton
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1"
                  >
                    {cancelText}
                  </LoadingButton>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};