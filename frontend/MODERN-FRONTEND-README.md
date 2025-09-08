# Frontend Moderne - Guide Développeur

## 🏗️ Architecture Moderne

### Store Global (Zustand)
```typescript
// src/stores/useAppStore.ts
import { useAppStore } from '@/stores/useAppStore';

// Utilisation dans composants
const { theme, setTheme, user, addNotification } = useAppStore();
```

### Hooks Personnalisés
```typescript
// src/hooks/useAdvancedHooks.ts
import { 
  useDebounce, 
  useIntersectionObserver, 
  useMediaQuery,
  useNotification 
} from '@/hooks/useAdvancedHooks';

// Exemple utilisation
const debouncedSearch = useDebounce(searchTerm, 300);
const { ref, isIntersecting } = useIntersectionObserver();
const isMobile = useMediaQuery('(max-width: 768px)');
const notify = useNotification();
```

### Système de Thème
```typescript
// src/providers/ThemeProvider.tsx
import { useThemeMode } from '@/providers/ThemeProvider';

const { theme, setTheme, toggleTheme, isDark } = useThemeMode();
```

## 🎨 Composants Modernes

### Command Palette
```typescript
// Activation automatique avec ⌘K ou /
import { CommandPalette } from '@/components/ui/command-palette';

// Ajouté dans App.tsx
<CommandPalette />
```

### Notifications Modernes
```typescript
import { useModernNotification } from '@/components/ui/modern-toaster';

const notify = useModernNotification();

// Utilisation
notify.success("Succès", "Operation terminée");
notify.error("Erreur", "Quelque chose a échoué");
notify.warning("Attention", "Vérifiez les paramètres");
notify.info("Information", "Nouvelle mise à jour");
```

### DataTable Avancée
```typescript
import { ModernDataTable } from '@/components/ui/modern-data-table';

const columns = [
  { id: 'name', header: 'Nom', accessorKey: 'name', sortable: true },
  { id: 'status', header: 'Status', accessorKey: 'status', 
    cell: ({ value }) => <Badge>{value}</Badge> }
];

const actions = [
  { id: 'edit', label: 'Éditer', icon: Edit, onClick: (row) => editRow(row) }
];

<ModernDataTable 
  data={data}
  columns={columns}
  actions={actions}
  searchable
  selectable
/>
```

### Layout Moderne
```typescript
// src/components/layout/ModernLayout.tsx
// Wrape automatiquement le contenu avec sidebar moderne
<ModernLayout>
  {children}
</ModernLayout>
```

## 🎯 Animations avec Framer Motion

### Composants Animés
```typescript
import { motion, AnimatePresence } from 'framer-motion';

// Animation d'entrée
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Contenu
</motion.div>

// Liste avec stagger
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ staggerChildren: 0.1 }}
>
  {items.map(item => 
    <motion.div
      key={item.id}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      {item.content}
    </motion.div>
  )}
</motion.div>
```

### Classes CSS Animations
```css
/* src/styles/animations.css */
.theme-transition /* Transitions thème smooth */
.premium-glow     /* Effet glow sur hover */
.skeleton-loader  /* Loading state animé */
.hover-lift       /* Effet lift sur hover */
.animate-fade-in  /* Animation fade-in */
.stagger-children /* Animation stagger automatique */
```

## 🎨 Système de Design

### Variables CSS Thème
```css
:root {
  --primary: hsl(200 95% 45%);
  --secondary: hsl(25 95% 53%);
  --accent: hsl(161 94% 30%);
  --background: hsl(0 0% 100%);
  /* ... */
}

.dark {
  --primary: hsl(217 91% 60%);
  --background: hsl(0 0% 0%);
  /* ... */
}
```

### Classes Utilitaires Drain Fortin
```typescript
// Couleurs de marque
className="bg-drain-blue-500 text-white"
className="border-drain-orange-400"
className="text-drain-green-600"

// États priorité
className="priority-p1" // Rouge urgence
className="priority-p2" // Orange haute
className="priority-p3" // Jaune normale  
className="priority-p4" // Vert basse

// Effets premium
className="card-premium hover-lift premium-glow"
```

## 📱 Responsive Design

### Breakpoints
```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // XL desktop
}

// Utilisation avec hook
const isMobile = useMediaQuery('(max-width: 768px)');
const isDesktop = useMediaQuery('(min-width: 1024px)');
```

### Classes Responsive
```typescript
// Mobile first approach
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
className="text-sm md:text-base lg:text-lg"
className="p-4 md:p-6 lg:p-8"
```

## ⚡ Performance & Optimisation

### React Optimisations
```typescript
// Mémorisation composants
const MemoComponent = React.memo(Component);

// Optimisation callbacks
const handleClick = useCallback((id: string) => {
  // action
}, [dependency]);

// Optimisation valeurs calculées
const expensiveValue = useMemo(() => 
  computeExpensiveValue(data), [data]
);
```

### Lazy Loading
```typescript
// Intersection Observer pour animations
const { ref, isIntersecting } = useIntersectionObserver({
  triggerOnce: true,
  threshold: 0.1
});

// Virtual scrolling pour grandes listes
<ModernDataTable virtualScrolling data={largeDataset} />
```

### Optimistic Updates
```typescript
const [optimisticData, updateOptimistic, revert] = useOptimisticUpdate(
  'user-profile', 
  currentUserData
);

// Update immédiat UI
updateOptimistic(newData);

// Si erreur serveur
try {
  await saveToServer(newData);
} catch {
  revert(); // Revenir état précédent
}
```

## 🔧 Configuration & Setup

### Variables d'Environnement
```bash
# .env
VITE_APP_TITLE="Drain Fortin CRM"
VITE_API_URL="http://localhost:3000"
VITE_ENABLE_MODERN_UI="true"
```

### Scripts NPM
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  }
}
```

### Configuration Tailwind Étendue
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'drain': {
          'blue': { /* palette bleu Drain Fortin */ },
          'orange': { /* palette orange */ },
          'green': { /* palette vert */ }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'premium-glow': 'premiumGlow 2s ease infinite'
      }
    }
  }
}
```

## 🧪 Testing

### Tests Composants
```typescript
// tests/components/ModernDashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { ModernDashboard } from '@/components/dashboard/ModernDashboard';

test('renders welcome message', () => {
  render(<ModernDashboard />);
  expect(screen.getByText(/Bienvenue/)).toBeInTheDocument();
});
```

### Tests Hooks
```typescript
// tests/hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useAdvancedHooks';

test('debounces value correctly', async () => {
  const { result } = renderHook(() => useDebounce('test', 500));
  expect(result.current).toBe('test');
});
```

## 📊 Monitoring & Debug

### Performance Monitoring
```typescript
// Utilisation React DevTools Profiler
import { Profiler } from 'react';

<Profiler id="Dashboard" onRender={(id, phase, actualDuration) => {
  console.log(`${id} ${phase}: ${actualDuration}ms`);
}}>
  <ModernDashboard />
</Profiler>
```

### Debug Store Zustand
```typescript
// DevTools activés automatiquement en development
const useAppStore = create<AppState>()(
  devtools(
    persist(storeImplementation, { name: 'app-store' }),
    { name: 'DrainFortinAppStore' }
  )
);
```

## 🚀 Déploiement

### Build Production
```bash
# Optimisation automatique
npm run build

# Preview local build
npm run preview

# Analyse bundle
npx vite-bundle-analyzer
```

### Variables Production
```bash
# Production .env
VITE_API_URL="https://api.drainfortin.com"
VITE_SENTRY_DSN="..."
VITE_ANALYTICS_ID="..."
```

---

**Documentation mise à jour le 8 janvier 2025**  
**Version Frontend Moderne v2.0**