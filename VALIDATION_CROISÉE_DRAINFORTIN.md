# 🔍 RAPPORT DE VALIDATION CROISÉE - DRAIN FORTIN
**Date**: 11 septembre 2025  
**Source**: drainfortin.ca (site web officiel)  
**Statut**: ⚠️ **MISES À JOUR CRITIQUES REQUISES**

---

## 📊 RÉSUMÉ EXÉCUTIF

### ❌ DISCORDANCES CRITIQUES IDENTIFIÉES
1. **Numéros de téléphone incorrects** dans la configuration
2. **Prix non alignés** avec la structure tarifaire réelle
3. **Certifications manquantes** (RBQ, APCHQ, CMMTQ, CCQ)
4. **Adresses physiques** non configurées

---

## 📞 INFORMATIONS DE CONTACT

### ✅ Données du Site Web Officiel
| Information | Valeur Réelle |
|-------------|---------------|
| **Téléphone Montréal** | 514-968-3239 |
| **Téléphone Rive-Nord** | 450-543-3939 |
| **Courriel** | estimation@drainfortin.ca |
| **Heures** | 24/7 (00:00-23:59) |

### ❌ Configuration Actuelle (.env)
```env
TWILIO_PHONE_NUMBER=+14389004385  # ❌ INCORRECT
```

### 🔧 CORRECTION REQUISE
```env
# Numéros réels de Guillaume Fortin
TWILIO_PHONE_NUMBER_MONTREAL=+15149683239
TWILIO_PHONE_NUMBER_RIVENORD=+14505433939
BUSINESS_EMAIL=estimation@drainfortin.ca
```

---

## 💰 STRUCTURE TARIFAIRE RÉELLE

### ✅ Prix Officiels du Site Web

#### Inspection par Caméra
| Service | Prix |
|---------|------|
| **Appel de service** | 350$ (Rive-Sud: 400$) |
| **Incluant** | Déplacement + caméra + 1h sur place |
| **Équipement additionnel** | 50$-100$ fixe |
| **Temps supplémentaire** | 42.50$/15 minutes |
| **Rapport écrit** | 100$ |

#### Nettoyage de Drain
| Service | Prix |
|---------|------|
| **Appel de service** | 450$ (Rive-Sud: 500$) |
| **Incluant** | 2 techniciens + 1h + jet haute pression |
| **Temps supplémentaire** | 42.50$/15 minutes |

### ❌ Configuration VAPI Actuelle
```javascript
// getQuote function retourne:
price: "trois cent cinquante dollars"  // ❌ Trop simplifié
```

### 🔧 CORRECTION REQUISE
```javascript
function getQuote({ serviceType, location }) {
  const prices = {
    'inspection_camera': {
      base: location === 'rive-sud' ? 400 : 350,
      description: 'trois cent cinquante dollars' // ou 'quatre cents dollars'
    },
    'nettoyage_drain': {
      base: location === 'rive-sud' ? 500 : 450,
      description: 'quatre cent cinquante dollars' // ou 'cinq cents dollars'
    },
    'temps_supplementaire': {
      base: 42.50,
      description: 'quarante-deux dollars cinquante par quinze minutes'
    }
  };
  // Logique plus sophistiquée selon le service
}
```

---

## 🗺️ ZONES DE SERVICE

### ✅ Zones Confirmées sur le Site
1. **Lanaudière** (Repentigny, Joliette, etc.)
2. **Laurentides** (Blainville, Saint-Jérôme, etc.)
3. **Grand Montréal**
4. **Laval**
5. **Rive-Sud** (tarification différente)

### ⚠️ Configuration VAPI
- Zones de service pas clairement définies dans checkServiceArea()
- Pas de distinction tarifaire Rive-Sud

---

## 🏢 INFORMATIONS CORPORATIVES

### ✅ Certifications Officielles
| Certification | Numéro/Statut |
|---------------|---------------|
| **RBQ** | 5794-7517-01 |
| **APCHQ** | Membre actif |
| **CMMTQ** | Membre actif |
| **CCQ** | Membre actif |

### ✅ Adresses Physiques
1. **Bureau Montréal**
   - 3909 Bd Saint-Jean Baptiste
   - Montréal, QC H1B 5V4

2. **Bureau Blainville**
   - 1060 boulevard du Curé-Labelle
   - Suite 200 bureau 1
   - Blainville, QC J7C 2M6

### ❌ Configuration VAPI
- Aucune mention des certifications
- Adresses non configurées

---

## 🛠️ SERVICES OFFERTS

### ✅ Services Confirmés sur le Site
1. **Inspection par caméra** ✅
2. **Débouchage d'égout et drain** ✅
3. **Nettoyage de drain français** ✅
4. **Remplacement de drain** ✅
5. **Excavation** ✅
6. **Réhabilitation sans tranchée** ⚠️ (Non configuré)

---

## 🎯 CONTRAINTES DE GUILLAUME - VALIDATION

| Contrainte | Statut | Validation Site Web |
|------------|--------|---------------------|
| **Prix en lettres** | ✅ Configuré | ⚠️ Structure tarifaire plus complexe |
| **Numéros chiffre par chiffre** | ✅ Configuré | ✅ Confirmé nécessaire |
| **Ne raccroche jamais** | ✅ Configuré | ✅ Service 24/7 confirmé |
| **Français québécois** | ✅ Configuré | ✅ Site entièrement en français |
| **Politesse** | ✅ Configuré | ✅ Approche professionnelle |
| **Numéros réels** | ❌ NON | 514-968-3239 & 450-543-3939 |

---

## 🚨 ACTIONS CRITIQUES REQUISES

### 1. Mise à jour IMMÉDIATE des numéros
```bash
# Dans .env
MONTREAL_PHONE=+15149683239
RIVENORD_PHONE=+14505433939
BUSINESS_EMAIL=estimation@drainfortin.ca
```

### 2. Ajuster la structure tarifaire
- Implémenter tarification Rive-Sud différenciée
- Ajouter temps supplémentaire (42.50$/15min)
- Distinguer inspection (350$) vs nettoyage (450$)

### 3. Ajouter les certifications
```javascript
const companyInfo = {
  rbq: "5794-7517-01",
  certifications: ["APCHQ", "CMMTQ", "CCQ"],
  addresses: {
    montreal: "3909 Bd Saint-Jean Baptiste, Montréal, QC H1B 5V4",
    blainville: "1060 boul. du Curé-Labelle, Suite 200, Blainville, QC J7C 2M6"
  }
};
```

### 4. Implémenter zones de service
```javascript
const serviceAreas = {
  standard: ["Montréal", "Laval", "Lanaudière", "Laurentides"],
  surcharge: ["Rive-Sud"], // +50$ sur tarif de base
  emergency: "24/7 toutes zones"
};
```

---

## ✅ VALIDATION FINALE

### Conformité Actuelle: **75%**

### Points Forts ✅
- Prononciation française configurée
- SSML activé pour numéros
- Assistant ne raccroche jamais
- Service 24/7 aligné

### Points Critiques ❌
- **Numéros de téléphone incorrects**
- **Structure tarifaire trop simple**
- **Certifications non mentionnées**
- **Zones de service incomplètes**

---

## 📝 SCRIPT DE MISE À JOUR RECOMMANDÉ

```javascript
// vapi-update-final-production.js
const finalConfig = {
  // Informations réelles de l'entreprise
  company: {
    phones: {
      montreal: "(514) 968-3239",
      rivenord: "(450) 543-3939"
    },
    email: "estimation@drainfortin.ca",
    rbq: "5794-7517-01",
    certifications: ["APCHQ", "CMMTQ", "CCQ"]
  },
  
  // Tarification réelle
  pricing: {
    inspection: { base: 350, riveSud: 400 },
    cleaning: { base: 450, riveSud: 500 },
    overtime: 42.50 // par 15 minutes
  },
  
  // Prompt système mis à jour
  systemPrompt: `Vous êtes l'assistant de Drain Fortin, RBQ 5794-7517-01.
    Nos bureaux: Montréal (514) 968-3239 et Rive-Nord (450) 543-3939.
    Service 24/7. Certifié APCHQ, CMMTQ, CCQ.
    
    TARIFS (toujours prononcer en lettres):
    - Inspection caméra: trois cent cinquante dollars (Rive-Sud: quatre cents)
    - Nettoyage drain: quatre cent cinquante dollars (Rive-Sud: cinq cents)
    - Temps supplémentaire: quarante-deux dollars cinquante par quinze minutes
    
    NUMÉROS (toujours chiffre par chiffre):
    Montréal: cinq, un, quatre, neuf, six, huit, trois, deux, trois, neuf
    Rive-Nord: quatre, cinq, zéro, cinq, quatre, trois, trois, neuf, trois, neuf`
};
```

---

## 🎯 CONCLUSION

Le système est fonctionnel mais nécessite des mises à jour **CRITIQUES** pour refléter les informations réelles de l'entreprise Drain Fortin. Les numéros de téléphone doivent être corrigés IMMÉDIATEMENT avant tout appel client.

**Priorité #1**: Remplacer les numéros de test par les vrais numéros de Guillaume.

---

*Validation effectuée le 11 septembre 2025 contre drainfortin.ca*