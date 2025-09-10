# Frontend Architecture - Modular Structure

## Vue d'ensemble

Architecture modulaire et scalable organisée par feature ET par type, optimisée pour le code splitting et la maintenabilité.

## Structure Complète

```
src/
├── app/                      # Application core
│   ├── providers/            # Context providers (Theme, Auth, Notification)
│   ├── router/               # Routing configuration
│   └── store/                # Zustand stores et state management
├── components/               # Composants réutilisables
│   ├── common/              # Composants UI de base (Button, Input, Modal)
│   ├── layout/              # Composants de layout (Header, Sidebar, Footer)
│   ├── features/            # Composants spécifiques aux features
│   └── [existing folders]   # Structure existante préservée
├── features/                # Modules de features auto-contenus
│   ├── dashboard/           # Module dashboard complet
│   ├── calls/               # Module calls/appels
│   ├── leads/               # Module leads/prospects  
│   ├── settings/            # Module paramètres
│   ├── crm/                 # Module CRM
│   └── analytics/           # Module analytics
├── hooks/                   # Hooks personnalisés organisés
│   ├── api/                 # Hooks pour API et données
│   ├── ui/                  # Hooks pour UI et interactions
│   └── business/            # Hooks pour logique métier
├── lib/                     # Configuration bibliothèques externes
│   ├── config/              # Configuration app (env, API, features)
│   ├── constants/           # Constantes et enums
│   └── validators/          # Schémas de validation
├── services/                # Services API existants
├── styles/                  # Styles globaux existants
├── types/                   # Types TypeScript existants
└── utils/                   # Fonctions utilitaires existantes
```

## Principes Architecturaux

### 1. Séparation des Responsabilités
- **app/**: Core application (routing, state, providers)
- **components/**: UI réutilisable organisée par type
- **features/**: Modules de domaine auto-contenus
- **hooks/**: Logique réutilisable par catégorie
- **lib/**: Configuration et intégrations externes

### 2. Architecture Feature-Based
Chaque feature dans `features/` peut contenir :
```
features/dashboard/
├── components/          # Composants spécifiques
├── hooks/              # Hooks spécifiques  
├── services/           # Services API spécifiques
├── types/              # Types spécifiques
└── index.ts            # Exports publics
```

### 3. Optimisations

#### Code Splitting
- Chaque feature peut être lazy-loaded
- Composants organisés pour tree-shaking optimal
- Exports ciblés via index.ts

#### Maintenabilité
- Tests colocalisés possibles dans chaque module
- Imports organisés par barrel exports
- Dépendances claires entre modules

#### Scalabilité
- Structure peut grandir sans désorganisation
- Nouveaux développeurs trouvent facilement le code
- Refactoring facilité par organisation claire

## Patterns d'Import

### Import depuis features
```typescript
// Import d'une feature complète
import { dashboardFeature } from '@/features/dashboard';

// Import spécifique depuis une feature  
import { DashboardView } from '@/features/dashboard/components/DashboardView';
```

### Import de composants par type
```typescript
// Composants communs
import { Button, Modal } from '@/components/common';

// Composants de layout
import { Header, Sidebar } from '@/components/layout';
```

### Import de hooks par catégorie
```typescript
// Hooks API
import { useCalls, useAnalytics } from '@/hooks/api';

// Hooks UI
import { useToast, useFeatureFlag } from '@/hooks/ui';

// Hooks métier
import { useCallAnalytics } from '@/hooks/business';
```

## Migration Progressive

### Existant Préservé
- Tous les dossiers et fichiers existants sont conservés
- Pas de breaking changes
- Structure existante intégrée dans la nouvelle organisation

### Migration Future
1. Déplacer progressivement les composants vers les bonnes catégories
2. Créer les modules features au fur et à mesure
3. Refactoriser les imports pour utiliser les barrel exports

## Avantages

### Développement
- **Développement parallèle**: Équipes peuvent travailler sur différentes features
- **Code splitting naturel**: Chargement optimisé des modules
- **Tests organisés**: Stratégie de test claire par module

### Maintenance  
- **Debugging facilité**: Code organisé logiquement
- **Refactoring sécurisé**: Impact scope limité
- **Documentation naturelle**: Structure auto-documentée

### Performance
- **Bundle optimization**: Tree-shaking efficace
- **Lazy loading**: Chargement à la demande
- **Cache optimization**: Modules indépendants cachés séparément

## Fichiers Index.ts

Chaque dossier contient un `index.ts` pour :
- Organiser les exports publics
- Faciliter les imports  
- Permettre le tree-shaking
- Maintenir une API claire

Cette structure fournit une base solide pour une application frontend moderne, maintenable et performante.