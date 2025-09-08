/**
 * Advanced Animation Hooks
 * Smooth, performant animations with physics-based motion
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';

// Spring physics animation
export function useSpring({
  from = 0,
  to = 1,
  config = {}
}: {
  from?: number;
  to?: number;
  config?: {
    tension?: number;
    friction?: number;
    mass?: number;
    precision?: number;
  };
}) {
  const [value, setValue] = useState(from);
  const [velocity, setVelocity] = useState(0);
  const animationRef = useRef<number>();
  
  const { tension = 170, friction = 26, mass = 1, precision = 0.01 } = config;

  useEffect(() => {
    let position = from;
    let vel = 0;

    const animate = () => {
      const spring = -tension * (position - to) / mass;
      const damper = -friction * vel / mass;
      const acceleration = spring + damper;
      
      vel += acceleration * 0.016; // ~60fps
      position += vel * 0.016;
      
      setValue(position);
      setVelocity(vel);
      
      if (Math.abs(position - to) > precision || Math.abs(vel) > precision) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [from, to, tension, friction, mass, precision]);

  return { value, velocity };
}

// Stagger animation for lists
export function useStagger(
  count: number,
  delay = 50
): number[] {
  const [progress, setProgress] = useState<number[]>(new Array(count).fill(0));

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < count; i++) {
      timeouts.push(
        setTimeout(() => {
          setProgress(prev => {
            const next = [...prev];
            next[i] = 1;
            return next;
          });
        }, i * delay)
      );
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [count, delay]);

  return progress;
}

// Morph between shapes/paths
export function useMorph(
  from: string,
  to: string,
  duration = 1000
) {
  const [path, setPath] = useState(from);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Simple linear interpolation for demo
      // In production, use a proper SVG path interpolation library
      setPath(progress < 1 ? from : to);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [from, to, duration]);

  return path;
}

// Typewriter effect
export function useTypewriter(
  text: string,
  speed = 50,
  startDelay = 0
) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let charIndex = 0;

    const startTyping = () => {
      setIsTyping(true);
      
      const typeChar = () => {
        if (charIndex < text.length) {
          setDisplayText(text.slice(0, charIndex + 1));
          charIndex++;
          timeout = setTimeout(typeChar, speed);
        } else {
          setIsTyping(false);
          setIsComplete(true);
        }
      };

      typeChar();
    };

    timeout = setTimeout(startTyping, startDelay);

    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  const reset = useCallback(() => {
    setDisplayText('');
    setIsTyping(false);
    setIsComplete(false);
  }, []);

  return { displayText, isTyping, isComplete, reset };
}

// Count up animation
export function useCountUp({
  start = 0,
  end,
  duration = 2000,
  decimals = 0
}: {
  start?: number;
  end: number;
  duration?: number;
  decimals?: number;
}) {
  const [count, setCount] = useState(start);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startTime = Date.now();
    const diff = end - start;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = start + diff * easeProgress;
      
      setCount(parseFloat(currentCount.toFixed(decimals)));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [start, end, duration, decimals]);

  return count;
}

// Shake animation
export function useShake(
  trigger: boolean,
  intensity = 5,
  duration = 500
) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!trigger) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const startTime = Date.now();
    let animationFrame: number;

    const shake = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const dampening = 1 - progress;
        
        setOffset({
          x: (Math.random() - 0.5) * intensity * dampening,
          y: (Math.random() - 0.5) * intensity * dampening
        });
        
        animationFrame = requestAnimationFrame(shake);
      } else {
        setOffset({ x: 0, y: 0 });
      }
    };

    animationFrame = requestAnimationFrame(shake);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [trigger, intensity, duration]);

  return offset;
}

// Pulse animation
export function usePulse(
  active = true,
  minScale = 0.95,
  maxScale = 1.05,
  duration = 1000
) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!active) {
      setScale(1);
      return;
    }

    let animationFrame: number;
    const startTime = Date.now();

    const pulse = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % duration) / duration;
      
      // Sine wave for smooth pulsing
      const sineProgress = Math.sin(progress * Math.PI * 2);
      const currentScale = minScale + (maxScale - minScale) * (sineProgress + 1) / 2;
      
      setScale(currentScale);
      animationFrame = requestAnimationFrame(pulse);
    };

    animationFrame = requestAnimationFrame(pulse);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [active, minScale, maxScale, duration]);

  return scale;
}

// Confetti animation
export function useConfetti(
  trigger: boolean,
  particleCount = 50
) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    if (!trigger) return;

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#5E60CE'];
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: Date.now() + i,
      x: 50,
      y: 50,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 10 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 2
    }));

    setParticles(newParticles);

    const gravity = 0.3;
    let animationFrame: number;

    const animate = () => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + gravity
        })).filter(p => p.y < 100);

        if (updated.length > 0) {
          animationFrame = requestAnimationFrame(animate);
        }
        
        return updated;
      });
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [trigger, particleCount]);

  return particles;
}

// Follow mouse animation
export function useMouseFollow(
  smoothing = 0.1,
  offset = { x: 0, y: 0 }
) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = {
        x: e.clientX + offset.x,
        y: e.clientY + offset.y
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      setPosition(prev => ({
        x: prev.x + (targetRef.current.x - prev.x) * smoothing,
        y: prev.y + (targetRef.current.y - prev.y) * smoothing
      }));
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [smoothing, offset.x, offset.y]);

  return position;
}

// Reveal on scroll animation
export function useScrollReveal(
  threshold = 0.1,
  rootMargin = '0px'
) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, hasAnimated]);

  return { elementRef, isVisible };
}

// Magnetic hover effect
export function useMagneticHover(
  strength = 0.5,
  threshold = 100
) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const distance = Math.sqrt(distX ** 2 + distY ** 2);
    
    if (distance < threshold) {
      const pullX = (distX / threshold) * strength * 10;
      const pullY = (distY / threshold) * strength * 10;
      setOffset({ x: pullX, y: pullY });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, [strength, threshold]);

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  return {
    elementRef,
    offset,
    magneticProps: {
      onMouseLeave: handleMouseLeave,
      style: {
        transform: `translate(${offset.x}px, ${offset.y}px)`
      }
    }
  };
}