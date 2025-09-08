# Variables d'Environnement pour le Développement

## Création du fichier .env

Créez un fichier `.env` à la racine du dossier `frontend` avec le contenu suivant :

```bash
# Supabase Configuration for Development
VITE_SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.YyiZxzU6DuZsFwXLebdMqRJHhWlnVYyDgJz1HVsIjvI

# VAPI Configuration
VITE_VAPI_PUBLIC_KEY=test_vapi_key_for_development

# Application Configuration
VITE_APP_ENV=development
VITE_APP_NAME=CRM Drain Fortin

# WebSocket Configuration
VITE_WS_URL=ws://localhost:3001

# Logging Level
VITE_LOG_LEVEL=debug
```

## Instructions

1. Copiez le contenu ci-dessus
2. Créez un nouveau fichier appelé `.env` dans le dossier `frontend`
3. Collez le contenu
4. Sauvegardez le fichier
5. Redémarrez le serveur de développement

## Variables Obligatoires

- `VITE_SUPABASE_URL` : URL de votre instance Supabase
- `VITE_SUPABASE_ANON_KEY` : Clé publique Supabase (safe pour le frontend)

## Variables Optionnelles

- `VITE_VAPI_PUBLIC_KEY` : Clé publique VAPI (pour les appels téléphoniques)
- `VITE_WS_URL` : URL du serveur WebSocket
- `VITE_LOG_LEVEL` : Niveau de logging (debug, info, warn, error)
