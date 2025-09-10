import { useState, useEffect, useRef } from 'react';
// Simple intersection observer hook
function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      options
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, options]);

  return { hasIntersected };
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  srcSet?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Lazy loading image component with intersection observer
export const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  srcSet,
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(
    priority ? src : undefined
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { hasIntersected } = useIntersectionObserver(containerRef, {
    rootMargin: '50px',
    threshold: 0.01,
  });

  // Load image when it enters viewport
  useEffect(() => {
    if (hasIntersected && !priority) {
      setImageSrc(src);
    }
  }, [hasIntersected, src, priority]);

  // Preload priority images
  useEffect(() => {
    if (priority && src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      if (srcSet) {
        link.setAttribute('imagesrcset', srcSet);
      }
      if (sizes) {
        link.setAttribute('imagesizes', sizes);
      }
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, src, srcSet, sizes]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  // Generate blur placeholder
  const getPlaceholder = () => {
    if (placeholder === 'empty') return 'transparent';
    if (blurDataURL) return `url(${blurDataURL})`;
    // Default blur gradient
    return 'linear-gradient(to right, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)';
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
        background: isLoading ? getPlaceholder() : 'transparent',
      }}
    >
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          srcSet={srcSet}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            transition-opacity duration-300
            ${isLoading ? 'opacity-0' : 'opacity-100'}
            ${hasError ? 'hidden' : ''}
            ${className}
          `}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      
      {hasError && (
        <div className="flex items-center justify-center w-full h-full bg-gray-200 dark:bg-gray-800">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

// Picture component for responsive images
export const OptimizedPicture: React.FC<{
  sources: Array<{
    srcSet: string;
    media?: string;
    type?: string;
  }>;
  fallback: Omit<OptimizedImageProps, 'srcSet'>;
}> = React.memo(({ sources, fallback }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { hasIntersected } = useIntersectionObserver(containerRef, {
    rootMargin: '50px',
  });

  useEffect(() => {
    if (hasIntersected) {
      setIsVisible(true);
    }
  }, [hasIntersected]);

  return (
    <div ref={containerRef}>
      {isVisible && (
        <picture>
          {sources.map((source, index) => (
            <source
              key={index}
              srcSet={source.srcSet}
              media={source.media}
              type={source.type}
            />
          ))}
          <OptimizedImage {...fallback} />
        </picture>
      )}
    </div>
  );
});

OptimizedPicture.displayName = 'OptimizedPicture';

// Image preloader utility
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Batch image preloader
export const preloadImages = async (
  srcs: string[],
  options?: {
    priority?: 'high' | 'low';
    concurrency?: number;
  }
): Promise<void> => {
  const { priority = 'low', concurrency = 3 } = options || {};
  
  if (priority === 'high') {
    // Preload all images immediately
    await Promise.all(srcs.map(preloadImage));
  } else {
    // Preload with concurrency limit
    const queue = [...srcs];
    const loading = new Set<Promise<void>>();
    
    while (queue.length > 0 || loading.size > 0) {
      while (loading.size < concurrency && queue.length > 0) {
        const src = queue.shift()!;
        const promise = preloadImage(src)
          .catch(() => {}) // Ignore errors
          .finally(() => loading.delete(promise));
        loading.add(promise);
      }
      
      if (loading.size > 0) {
        await Promise.race(loading);
      }
    }
  }
};

// Generate srcSet for responsive images
export const generateSrcSet = (
  baseUrl: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1536]
): string => {
  return sizes
    .map(size => {
      const url = baseUrl.replace(/(\.\w+)$/, `@${size}w$1`);
      return `${url} ${size}w`;
    })
    .join(', ');
};

// Generate sizes attribute for responsive images
export const generateSizes = (
  breakpoints: Array<{ maxWidth?: number; size: string }>
): string => {
  return breakpoints
    .map(({ maxWidth, size }) => {
      if (maxWidth) {
        return `(max-width: ${maxWidth}px) ${size}`;
      }
      return size;
    })
    .join(', ');
};