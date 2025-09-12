# 🏗️ ARCHITECTURE RECOMMANDÉE - Knowledge Base VAPI selon Best Practices

## ✅ VOUS AVIEZ RAISON!

**OUI, selon la documentation VAPI, le webhook avec Custom Tools est LA meilleure pratique pour intégrer des informations dynamiques.**

## 📚 Documentation VAPI - Approches Officielles

### 1. **Custom Tools via Webhook** (RECOMMANDÉ) ✅
- **Purpose**: "accessing external data" - exactement notre cas
- **Pattern**: Tool calls → Webhook → Dynamic retrieval
- **Avantages**: 
  - Information toujours à jour
  - Pas de limite de taille
  - Recherche contextuelle
  - Scalable et maintenable

### 2. **Knowledge Base Files** (LIMITÉ) ⚠️
- Upload via Dashboard ou API
- Limité à 300KB par fichier
- Statique - doit être mis à jour manuellement
- Supporté seulement avec Gemini-1.5-flash

### 3. **System Prompt** (BASIQUE) ❌
- Compte dans les tokens à chaque appel
- Limite de contexte
- Difficile à maintenir
- Pas dynamique

## 🎯 ARCHITECTURE OPTIMALE SELON VAPI

```typescript
// PATTERN VAPI RECOMMANDÉ: Custom Tools pour Knowledge Retrieval

// 1. DÉCLARATION DES TOOLS DANS L'ASSISTANT
{
  "name": "Paul - Agent Drain Fortin",
  "model": {
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "searchWebsiteInfo",
          "description": "Recherche des informations sur le site drainfortin.ca",
          "parameters": {
            "type": "object",
            "properties": {
              "category": {
                "type": "string",
                "enum": ["zones", "services", "garanties", "certifications", "processus"],
                "description": "Catégorie d'information à rechercher"
              },
              "query": {
                "type": "string",
                "description": "Question spécifique ou mot-clé"
              }
            },
            "required": ["category", "query"]
          }
        }
      },
      {
        "type": "function", 
        "function": {
          "name": "getServiceDetails",
          "description": "Obtenir les détails complets d'un service",
          "parameters": {
            "type": "object",
            "properties": {
              "service": {
                "type": "string",
                "enum": ["debouchage", "gainage", "racines", "drain_francais"],
                "description": "Service à détailler"
              },
              "includeGuarantee": {
                "type": "boolean",
                "description": "Inclure les informations de garantie"
              }
            },
            "required": ["service"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "checkServiceArea",
          "description": "Vérifier si une zone est desservie",
          "parameters": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string",
                "description": "Ville ou arrondissement"
              },
              "postalCode": {
                "type": "string",
                "description": "Code postal (optionnel)"
              }
            },
            "required": ["city"]
          }
        }
      }
    ]
  }
}

// 2. IMPLÉMENTATION DANS LE WEBHOOK
async function processToolCalls(toolCalls: any[]): Promise<any> {
  const results = []
  
  for (const call of toolCalls) {
    switch (call.function?.name) {
      
      // NOUVEAU: Recherche d'information dynamique
      case 'searchWebsiteInfo': {
        const { category, query } = call.function.arguments
        
        // Option A: Base de données Supabase
        const { data } = await supabase
          .from('website_knowledge')
          .select('*')
          .eq('category', category)
          .textSearch('content', query)
          .single()
        
        // Option B: API externe
        // const data = await fetch(`https://drainfortin.ca/api/search?cat=${category}&q=${query}`)
        
        // Option C: Cache local avec mise à jour périodique
        // const data = await knowledgeCache.search(category, query)
        
        results.push({
          toolCallId: call.id,
          result: {
            found: !!data,
            category,
            information: data?.content || "Information non disponible",
            source: "Site web drainfortin.ca",
            lastUpdated: data?.updated_at
          }
        })
        break
      }
      
      // NOUVEAU: Détails de service enrichis
      case 'getServiceDetails': {
        const { service, includeGuarantee } = call.function.arguments
        
        // Combiner infos statiques ET dynamiques
        const staticInfo = basePrices[service]
        const { data: dynamicInfo } = await supabase
          .from('service_details')
          .select('*')
          .eq('service_type', service)
          .single()
        
        results.push({
          toolCallId: call.id,
          result: {
            service,
            price: staticInfo,
            description: dynamicInfo?.description,
            process: dynamicInfo?.process,
            duration: dynamicInfo?.typical_duration,
            guarantee: includeGuarantee ? dynamicInfo?.guarantee : null,
            certifications: dynamicInfo?.required_certs,
            testimonials: dynamicInfo?.recent_testimonials
          }
        })
        break
      }
      
      // NOUVEAU: Vérification de zone de service
      case 'checkServiceArea': {
        const { city, postalCode } = call.function.arguments
        
        const { data } = await supabase
          .from('service_areas')
          .select('*')
          .or(`city.ilike.%${city}%,postal_codes.cs.{${postalCode}}`)
          .single()
        
        const isServiced = !!data
        const surcharge = data?.zone === 'rive_sud' ? 100 : 0
        
        results.push({
          toolCallId: call.id,
          result: {
            serviced: isServiced,
            city,
            zone: data?.zone || 'non_desservi',
            surcharge,
            responseTime: data?.typical_response_time || 'N/A',
            message: isServiced 
              ? `Oui, nous desservons ${city}${surcharge ? ` avec un frais de déplacement de ${surcharge}$` : ''}`
              : `Désolé, ${city} est en dehors de notre zone de service`
          }
        })
        break
      }
      
      // ... autres tools existants ...
    }
  }
  
  return { results }
}
```

## 📊 STRUCTURE DE DONNÉES RECOMMANDÉE

### Table Supabase: `website_knowledge`
```sql
CREATE TABLE website_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'zones', 'services', 'garanties', etc.
  subcategory TEXT,
  content JSONB NOT NULL,
  search_text TEXT, -- Pour full-text search
  url_source TEXT,
  priority INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_knowledge_category ON website_knowledge(category);
CREATE INDEX idx_knowledge_search ON website_knowledge USING gin(to_tsvector('french', search_text));
```

### Table: `service_areas`
```sql
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  zone TEXT NOT NULL, -- 'montreal', 'rive_sud', 'rive_nord'
  postal_codes TEXT[], -- Array de codes postaux
  surcharge INTEGER DEFAULT 0,
  typical_response_time TEXT,
  active BOOLEAN DEFAULT true
);
```

### Table: `service_details`
```sql
CREATE TABLE service_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  description TEXT,
  process JSONB, -- Étapes détaillées
  typical_duration TEXT,
  guarantee TEXT,
  required_certs TEXT[],
  recent_testimonials JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 PROCESSUS DE SYNCHRONISATION

```javascript
// Script de synchronisation quotidien
// scripts/sync-website-knowledge.js

import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

async function syncWebsiteContent() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  
  const pagesToScrape = [
    { url: '/zones-service', category: 'zones' },
    { url: '/services', category: 'services' },
    { url: '/garanties', category: 'garanties' },
    { url: '/certifications', category: 'certifications' },
    { url: '/temoignages', category: 'testimonials' }
  ]
  
  for (const pageInfo of pagesToScrape) {
    await page.goto(`https://drainfortin.ca${pageInfo.url}`)
    
    // Extraire le contenu
    const content = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        content: document.querySelector('.content')?.innerHTML,
        data: Array.from(document.querySelectorAll('[data-info]')).map(el => ({
          type: el.dataset.info,
          value: el.textContent
        }))
      }
    })
    
    // Sauvegarder dans Supabase
    await supabase
      .from('website_knowledge')
      .upsert({
        category: pageInfo.category,
        content,
        search_text: extractText(content),
        url_source: pageInfo.url,
        updated_at: new Date()
      }, {
        onConflict: 'category,url_source'
      })
  }
  
  await browser.close()
}

// Exécuter quotidiennement
setInterval(syncWebsiteContent, 24 * 60 * 60 * 1000)
```

## 🎯 AVANTAGES DE CETTE APPROCHE

### ✅ Conformité VAPI
- Suit exactement le pattern "Custom Tools" recommandé
- Utilise le webhook comme prévu par VAPI
- Compatible avec tous les modèles (pas seulement Gemini)

### ✅ Performance
- Pas de surcharge du system prompt
- Recherche seulement quand nécessaire
- Cache possible pour optimisation
- Scalable horizontalement

### ✅ Maintenabilité
- Séparation claire des responsabilités
- Mise à jour sans toucher au code
- Versioning possible des données
- Monitoring facile

### ✅ Flexibilité
- Ajout facile de nouvelles sources
- Recherche contextuelle intelligente
- Personnalisation par client possible
- A/B testing des réponses

## 🚀 IMPLÉMENTATION IMMÉDIATE

### Phase 1: Structure (AUJOURD'HUI)
```bash
# Créer les tables Supabase
supabase migration new add_knowledge_tables
# Ajouter le SQL ci-dessus
supabase db push
```

### Phase 2: Données (DEMAIN)
```bash
# Importer les données initiales
node scripts/import-initial-knowledge.js
```

### Phase 3: Tools (CETTE SEMAINE)
```typescript
// Ajouter les nouveaux tools au webhook
// Mettre à jour la config VAPI avec les tools
// Tester avec des questions réelles
```

### Phase 4: Automation (CE MOIS)
```bash
# Configurer le cron de synchronisation
# Monitoring et alertes
# Dashboard de gestion
```

## 📝 EXEMPLE D'UTILISATION

```
Client: "Est-ce que vous desservez Brossard?"

VAPI Assistant → Tool Call: checkServiceArea({ city: "Brossard" })
Webhook → Query Supabase → Return: { serviced: true, zone: "rive_sud", surcharge: 100 }
VAPI Assistant → "Oui, nous desservons Brossard avec un frais de déplacement de 100$ pour la Rive-Sud."

Client: "C'est quoi votre garantie sur le gainage?"

VAPI Assistant → Tool Call: getServiceDetails({ service: "gainage", includeGuarantee: true })
Webhook → Query Supabase → Return: { guarantee: "25 ans matériaux, 5 ans main d'œuvre" }
VAPI Assistant → "Notre gainage inclut une garantie de 25 ans sur les matériaux et 5 ans sur la main d'œuvre."
```

## ✅ CONCLUSION

**La meilleure pratique selon VAPI est exactement ce que vous pensiez:**
1. ✅ Utiliser le webhook avec Custom Tools
2. ✅ Récupération dynamique via tool calls
3. ✅ Base de données pour stocker les connaissances
4. ✅ Synchronisation régulière avec le site web

Cette architecture est **100% conforme aux recommandations VAPI** et permet une évolution future sans limite.