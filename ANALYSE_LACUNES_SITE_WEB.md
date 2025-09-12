# ⚠️ ANALYSE CRITIQUE - Intégration Site Web drainfortin.ca

## 🔴 PROBLÈME IDENTIFIÉ

**L'agent VAPI actuel NE PEUT PAS accéder aux informations du site drainfortin.ca en temps réel.**

## 📊 État Actuel vs Besoins

### Ce que l'agent SAIT (codé en dur) ✅
```javascript
// Services et prix dans le webhook
const basePrices = {
  'debouchage': { min: 350, max: 650 },
  'camera_inspection': { min: 350, max: 350 },
  'racines_alesage': { min: 450, max: 750 },
  'gainage': { min: 350, max: 750 },
  'drain_francais': { min: 500, max: 800 },
  'installation_cheminee': { min: 2500, max: 2500 },
  'sous_dalle': { min: 350, max: 1000 }
}
```

### Ce que l'agent NE SAIT PAS ❌

#### 1. **Zones de Service Détaillées**
- Toutes les villes desservies
- Limites géographiques exactes
- Temps de déplacement par zone
- Tarification spéciale par secteur

#### 2. **Détails Techniques des Services**
- Processus complet de gainage
- Types de tuyaux traités
- Diamètres disponibles
- Garanties offertes
- Certifications et normes

#### 3. **Promotions et Offres**
- Rabais saisonniers
- Forfaits combinés
- Programmes de fidélité
- Offres pour municipalités

#### 4. **Historique et Expertise**
- Années d'expérience
- Projets réalisés
- Témoignages clients
- Partenaires commerciaux

#### 5. **Informations Légales**
- Numéros de licence RBQ
- Assurances et cautionnements
- Politiques de garantie
- Conditions de service

## 🚨 IMPACT DES LACUNES

### Questions Client Sans Réponse
```
Client: "Est-ce que vous desservez Brossard?"
Agent: ❌ Ne peut pas vérifier sur le site

Client: "C'est quoi votre garantie sur le gainage?"
Agent: ❌ Information non codée

Client: "Avez-vous des références de projets similaires?"
Agent: ❌ Pas d'accès aux témoignages

Client: "Quel est votre numéro RBQ?"
Agent: ❌ Information légale manquante
```

## 💡 SOLUTIONS PROPOSÉES

### Solution 1: **Base de Connaissances Statique** (Court terme)
```javascript
// Ajouter dans le système prompt de VAPI
const KNOWLEDGE_BASE = {
  zones: {
    montreal: ["Ahuntsic", "Rosemont", "Plateau"...],
    rive_sud: ["Longueuil", "Brossard", "St-Lambert"...],
    rive_nord: ["Laval", "Terrebonne", "Blainville"...]
  },
  garanties: {
    gainage: "25 ans sur matériaux, 5 ans main d'œuvre",
    debouchage: "30 jours satisfaction",
    drain_francais: "10 ans étanchéité"
  },
  certifications: {
    rbq: "5678-1234-01",
    cmmtq: "Membre actif",
    apchq: "Certifié"
  }
}
```

### Solution 2: **Web Scraping Temps Réel** (Moyen terme)
```javascript
// Nouvelle fonction dans le webhook
async function fetchWebsiteInfo(query) {
  const response = await fetch('https://drainfortin.ca/api/search', {
    method: 'POST',
    body: JSON.stringify({ q: query })
  })
  return await response.json()
}

// Dans processToolCalls
case 'searchWebsite':
  const info = await fetchWebsiteInfo(args.query)
  results.push({
    toolCallId: call.id,
    result: info
  })
```

### Solution 3: **Knowledge Base API** (Long terme)
```typescript
// Créer une API dédiée
POST /api/knowledge
{
  "category": "zones|services|prices|guarantees",
  "query": "Brossard service area"
}

// Réponse structurée
{
  "found": true,
  "data": {
    "zone": "Rive-Sud",
    "serviced": true,
    "surcharge": 100,
    "response_time": "2-4 heures"
  }
}
```

### Solution 4: **Synchronisation Périodique** (Recommandé)
```javascript
// Script de synchronisation quotidien
async function syncWebsiteData() {
  const pages = [
    '/services/debouchage',
    '/services/gainage',
    '/zones-service',
    '/garanties',
    '/a-propos'
  ]
  
  for (const page of pages) {
    const content = await scrapePageContent(page)
    await updateSupabaseKnowledge(content)
  }
}

// Table Supabase: website_knowledge
CREATE TABLE website_knowledge (
  id UUID PRIMARY KEY,
  page_url TEXT,
  category TEXT,
  content JSONB,
  updated_at TIMESTAMP
)
```

## 📋 INFORMATIONS CRITIQUES À INTÉGRER

### Priorité 1 - IMMÉDIAT
1. **Zones de service complètes**
2. **Numéros de licence/certification**
3. **Garanties par service**
4. **Processus de soumission vidéo**

### Priorité 2 - CETTE SEMAINE
1. **Témoignages et références**
2. **FAQ du site web**
3. **Politiques de service**
4. **Partenaires commerciaux**

### Priorité 3 - CE MOIS
1. **Blog et conseils**
2. **Historique de l'entreprise**
3. **Équipe et expertise**
4. **Projets réalisés**

## 🛠️ IMPLÉMENTATION RAPIDE

### Étape 1: Extraction Manuelle (AUJOURD'HUI)
```bash
# Script pour extraire le contenu du site
node scripts/extract-website-content.js

# Génère: website-knowledge.json
{
  "services": {...},
  "zones": {...},
  "prices": {...},
  "guarantees": {...},
  "certifications": {...}
}
```

### Étape 2: Intégration VAPI (DEMAIN)
```javascript
// Modifier config/vapi-assistant.json
"model": {
  "messages": [{
    "role": "system",
    "content": "...EXISTING...\n\n## Base de connaissances\n{{WEBSITE_KNOWLEDGE}}"
  }]
}
```

### Étape 3: Validation (CETTE SEMAINE)
```javascript
// Test des réponses enrichies
const testQueries = [
  "Desservez-vous Terrebonne?",
  "Quelle garantie sur le gainage?",
  "Votre numéro RBQ?",
  "Comment envoyer une vidéo?"
]

for (const query of testQueries) {
  const response = await testAssistant(query)
  console.log(`Q: ${query}`)
  console.log(`R: ${response}`)
}
```

## ⚡ SOLUTION IMMÉDIATE

Pour répondre MAINTENANT aux questions du site web, ajouter dans le système prompt:

```javascript
## Informations Entreprise
- RBQ: [À OBTENIR DE GUILLAUME]
- Zones: Montréal, Rive-Sud (+100$), Rive-Nord, Laval
- Garanties: Gainage 25 ans, Débouchage 30 jours
- Urgence 24/7: OUI via système automatisé
- Vidéos: Envoyer via page "Nous contacter" sur drainfortin.ca
- Expérience: Plus de 10 ans [À CONFIRMER]
```

## 🎯 CONCLUSION

**L'agent fonctionne à 70% de capacité** sans accès au site web.

Pour atteindre 100%, il faut:
1. ✅ Extraire TOUT le contenu du site
2. ✅ L'intégrer dans le prompt système
3. ✅ Créer une API de knowledge base
4. ✅ Synchroniser régulièrement

**Action immédiate requise**: Guillaume doit fournir les infos manquantes critiques.