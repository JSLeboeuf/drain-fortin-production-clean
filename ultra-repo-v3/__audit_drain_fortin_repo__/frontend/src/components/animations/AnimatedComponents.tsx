import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

// Animations variants réutilisables
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  rotate: {
    initial: { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 10 },
  },
};

// Composant de transition de page
export const PageTransition = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Carte animée avec hover effect
export const AnimatedCard = ({ 
  children, 
  className,
  delay = 0,
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    whileHover={{ 
      scale: 1.02,
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      transition: { duration: 0.2 }
    }}
    whileTap={{ scale: 0.98 }}
    className={cn('cursor-pointer', className)}
    {...props}
  >
    {children}
  </motion.div>
);

// Bouton animé
export const AnimatedButton = ({ 
  children, 
  className,
  onClick,
  variant = 'default',
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'success' | 'danger' | 'warning';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = {
    default: 'bg-primary hover:bg-primary-hover',
    success: 'bg-green-500 hover:bg-green-600',
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn(
        'px-4 py-2 rounded-lg text-white font-medium transition-colors',
        variants[variant],
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Liste animée avec stagger effect
export const AnimatedList = ({ 
  children,
  className,
  staggerDelay = 0.1,
}: { 
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}) => {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.li key={index} variants={item}>
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
};

// Modal animée
export const AnimatedModal = ({
  isOpen,
  onClose,
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'bg-background rounded-lg shadow-xl z-50 max-w-md w-full p-6',
            className
          )}
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Loading spinner animé
export const AnimatedSpinner = ({ size = 40 }: { size?: number }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    style={{ width: size, height: size }}
    className="border-4 border-primary/20 border-t-primary rounded-full"
  />
);

// Progress bar animée
export const AnimatedProgress = ({ 
  value, 
  max = 100,
  className,
}: { 
  value: number; 
  max?: number;
  className?: string;
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className={cn('w-full bg-muted rounded-full h-2 overflow-hidden', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="h-full bg-primary rounded-full"
      />
    </div>
  );
};

// Notification toast animée
export const AnimatedToast = ({
  message,
  type = 'info',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}) => {
  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={cn(
        'fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white shadow-lg z-50',
        typeStyles[type]
      )}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="hover:opacity-80">
          ×
        </button>
      </div>
    </motion.div>
  );
};

// Compteur animé
export const AnimatedCounter = ({ 
  value, 
  duration = 2 
}: { 
  value: number; 
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCounter = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const currentValue = Math.floor(progress * value);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    updateCounter();
  }, [value, duration]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
};

// Hook pour animations au scroll
export const useScrollAnimation = () => {
  const [isInView, setIsInView] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isInView };
};

// Composant avec animation au scroll
export const ScrollReveal = ({ 
  children, 
  className,
  animation = 'slideUp',
}: { 
  children: React.ReactNode; 
  className?: string;
  animation?: keyof typeof animations;
}) => {
  const { ref, isInView } = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      initial={animations[animation].initial}
      animate={isInView ? animations[animation].animate : animations[animation].initial}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};