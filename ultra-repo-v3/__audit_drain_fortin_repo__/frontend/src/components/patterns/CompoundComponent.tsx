/**
 * Compound Component Pattern
 * Flexible component composition with shared state
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

// Generic compound component context
interface CompoundContextValue<T = any> {
  state: T;
  setState: React.Dispatch<React.SetStateAction<T>>;
  props: Record<string, any>;
}

function createCompoundComponent<T = any>(defaultState: T) {
  const Context = createContext<CompoundContextValue<T> | undefined>(undefined);

  function useCompoundContext() {
    const context = useContext(Context);
    if (!context) {
      throw new Error('Compound component parts must be used within parent');
    }
    return context;
  }

  interface RootProps {
    children: ReactNode;
    value?: T;
    onChange?: (value: T) => void;
    [key: string]: any;
  }

  function Root({ children, value, onChange, ...props }: RootProps) {
    const [state, setState] = useState<T>(value ?? defaultState);

    const contextValue = useMemo(() => ({
      state: value ?? state,
      setState: onChange ?? setState,
      props
    }), [value, state, onChange, props]);

    return (
      <Context.Provider value={contextValue}>
        {children}
      </Context.Provider>
    );
  }

  return { Root, useCompoundContext, Context };
}

// Example: Advanced Card Component
interface CardState {
  expanded: boolean;
  selected: boolean;
  loading: boolean;
}

const { Root: CardRoot, useCompoundContext: useCardContext } = createCompoundComponent<CardState>({
  expanded: false,
  selected: false,
  loading: false
});

export function Card({ children, ...props }: { children: ReactNode; [key: string]: any }) {
  return (
    <CardRoot {...props}>
      <div className="card-container">
        {children}
      </div>
    </CardRoot>
  );
}

Card.Header = function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { state, setState } = useCardContext();
  
  return (
    <div 
      className={`card-header ${className} ${state.selected ? 'selected' : ''}`}
      onClick={() => setState(prev => ({ ...prev, expanded: !prev.expanded }))}
    >
      {children}
      {state.loading && <span className="loading-indicator">Loading...</span>}
    </div>
  );
};

Card.Body = function CardBody({ children, collapsible = true }: { children: ReactNode; collapsible?: boolean }) {
  const { state } = useCardContext();
  
  if (collapsible && !state.expanded) return null;
  
  return (
    <div className="card-body">
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children }: { children: ReactNode }) {
  const { state } = useCardContext();
  
  return (
    <div className={`card-footer ${state.selected ? 'selected' : ''}`}>
      {children}
    </div>
  );
};

// Advanced Accordion Component
interface AccordionState {
  openItems: Set<string>;
  allowMultiple: boolean;
}

const { Root: AccordionRoot, useCompoundContext: useAccordionContext } = 
  createCompoundComponent<AccordionState>({
    openItems: new Set(),
    allowMultiple: false
  });

export function Accordion({ 
  children, 
  allowMultiple = false,
  defaultOpen = []
}: { 
  children: ReactNode; 
  allowMultiple?: boolean;
  defaultOpen?: string[];
}) {
  const initialState = {
    openItems: new Set(defaultOpen),
    allowMultiple
  };

  return (
    <AccordionRoot value={initialState}>
      <div className="accordion">
        {children}
      </div>
    </AccordionRoot>
  );
}

Accordion.Item = function AccordionItem({ 
  id, 
  children 
}: { 
  id: string; 
  children: ReactNode;
}) {
  const { state } = useAccordionContext();
  const isOpen = state.openItems.has(id);

  return (
    <div className={`accordion-item ${isOpen ? 'open' : ''}`} data-id={id}>
      {children}
    </div>
  );
};

Accordion.Trigger = function AccordionTrigger({ 
  itemId, 
  children 
}: { 
  itemId: string; 
  children: ReactNode;
}) {
  const { state, setState } = useAccordionContext();
  
  const handleClick = useCallback(() => {
    setState(prev => {
      const newOpenItems = new Set(prev.openItems);
      
      if (newOpenItems.has(itemId)) {
        newOpenItems.delete(itemId);
      } else {
        if (!prev.allowMultiple) {
          newOpenItems.clear();
        }
        newOpenItems.add(itemId);
      }
      
      return { ...prev, openItems: newOpenItems };
    });
  }, [itemId, setState]);

  return (
    <button 
      className="accordion-trigger" 
      onClick={handleClick}
      aria-expanded={state.openItems.has(itemId)}
    >
      {children}
    </button>
  );
};

Accordion.Content = function AccordionContent({ 
  itemId, 
  children 
}: { 
  itemId: string; 
  children: ReactNode;
}) {
  const { state } = useAccordionContext();
  const isOpen = state.openItems.has(itemId);

  if (!isOpen) return null;

  return (
    <div className="accordion-content">
      {children}
    </div>
  );
};

// Render Props Pattern Component
interface RenderPropState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function DataProvider<T>({
  loader,
  children,
  fallback,
  errorFallback
}: {
  loader: () => Promise<T>;
  children: (state: RenderPropState<T>) => ReactNode;
  fallback?: ReactNode;
  errorFallback?: (error: Error) => ReactNode;
}) {
  const [state, setState] = useState<RenderPropState<T>>({
    data: null,
    loading: true,
    error: null
  });

  React.useEffect(() => {
    loader()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }));
  }, []);

  if (state.loading && fallback) return <>{fallback}</>;
  if (state.error && errorFallback) return <>{errorFallback(state.error)}</>;
  
  return <>{children(state)}</>;
}

// Higher-Order Component Pattern
export function withLoadingState<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & { loading?: boolean }> {
  return function WithLoadingComponent(props: P & { loading?: boolean }) {
    if (props.loading) {
      return (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Custom Hook Factory Pattern
export function createResourceHook<T>(
  fetcher: (params: any) => Promise<T>
) {
  return function useResource(params: any) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher(params);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }, [params]);

    React.useEffect(() => {
      refetch();
    }, [refetch]);

    return { data, loading, error, refetch };
  };
}

// Provider Pattern with Reducer
interface AppState {
  user: any;
  theme: 'light' | 'dark';
  notifications: any[];
}

type AppAction = 
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'CLEAR_NOTIFICATIONS' };

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = React.useReducer(appReducer, {
    user: null,
    theme: 'light',
    notifications: []
  });

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}