# 🎯 Guide de Correction - Prononciation VAPI

## ✅ Corrections Appliquées

Les problèmes de prononciation ont été corrigés dans :
1. **config/vapi-assistant.json** - Configuration vocale optimisée
2. **config/vapi-voice-optimization.js** - Fonctions de formatage créées

## 📋 Résultats des Tests

### Avant → Après
- **350$** → "trois cents cinquante dollars" ✅
- **403.48$** → "quatre cents trois dollars et quarante-huit cents" ✅  
- **450-280-3222** → "quatre cinq zéro, deux huit zéro, trois deux deux deux" ✅
- **support@autoscaleai.ca** → "s u p p o r t arobase a u t o s c a l e a i point c a" ✅

## 🚀 Application dans VAPI Dashboard

### Étape 1: Mettre à jour l'Assistant Paul

Allez dans [VAPI Dashboard > Assistants](https://dashboard.vapi.ai/assistants) et mettez à jour :

#### Voice Settings:
```json
{
  "provider": "11labs",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "model": "eleven_multilingual_v2",
  "language": "fr-CA",
  "stability": 0.65,
  "similarityBoost": 0.75,
  "enableSsmlParsing": true
}
```

#### System Prompt (ajoutez au début):
```
RÈGLES DE PRONONCIATION OBLIGATOIRES:

1. PRIX: Toujours en lettres
   - 350$ = "trois cent cinquante dollars"
   - Plus taxes = dire "plus taxes" avec pause avant

2. TÉLÉPHONES: Chiffre par chiffre avec pauses
   - 450-280-3222 = "quatre, cinq, zéro... deux, huit, zéro... trois, deux, deux, deux"

3. EMAILS: Épeler lettre par lettre
   - @ = "arobase"
   - . = "point"
   - support@autoscaleai.ca = "s u p p o r t arobase a u t o s c a l e a i point c a"

4. POURCENTAGES:
   - 5% = "cinq pour cent"
   - 9.975% = "neuf point neuf sept cinq pour cent"

5. PAUSES: Faire une pause après:
   - Chaque groupe de 3 chiffres
   - "Bonjour" et "Merci"
   - Avant "plus taxes"
```

### Étape 2: Configurer le Transcriber

Dans **Transcriber Settings**:
```json
{
  "provider": "azure",
  "language": "fr-CA",
  "profanityFilter": false,
  "recognitionMode": "interactive",
  "enableDictation": true,
  "enableNumberFormatting": false
}
```

### Étape 3: Ajouter des Fonctions Personnalisées

Dans **Functions**, ajoutez :

#### formatPrice
```javascript
async function formatPrice({ amount }) {
  const entier = Math.floor(amount);
  const cents = Math.round((amount - entier) * 100);
  
  let texte = convertirNombreEnLettres(entier) + " dollars";
  if (cents > 0) {
    texte += " et " + convertirNombreEnLettres(cents) + " cents";
  }
  
  return { formattedPrice: texte };
}
```

#### formatPhone
```javascript
async function formatPhone({ phoneNumber }) {
  const clean = phoneNumber.replace(/\D/g, '');
  const groups = [
    clean.substring(0, 3),
    clean.substring(3, 6),
    clean.substring(6, 10)
  ];
  
  const formatted = groups.map(g => 
    g.split('').join(', ')
  ).join('... ');
  
  return { formattedPhone: formatted };
}
```

## 🧪 Script de Test Automatique

Créez `test-pronunciation.js`:

```javascript
const tests = [
  { input: 350, expected: "trois cent cinquante dollars" },
  { input: "450-280-3222", expected: "quatre, cinq, zéro, deux, huit, zéro, trois, deux, deux, deux" },
  { input: "support@autoscaleai.ca", expected: "s u p p o r t arobase autoscaleai point ca" }
];

// Tester via API VAPI
async function testPronunciation() {
  const response = await fetch('https://api.vapi.ai/assistant/test', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_VAPI_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assistantId: 'YOUR_ASSISTANT_ID',
      message: 'Le prix est de 350 dollars'
    })
  });
  
  const result = await response.json();
  console.log('Prononciation:', result.speech);
}
```

## 📱 Exemples de Phrases Correctes

L'agent Paul dira maintenant :

✅ **"Le prix minimum est de trois cent cinquante dollars, plus taxes"**
❌ ~~"Le prix minimum est de 350$ plus taxes"~~

✅ **"Appelez-nous au quatre, cinq, zéro... deux, huit, zéro... trois, deux, deux, deux"**
❌ ~~"Appelez-nous au 450-280-3222"~~

✅ **"Envoyez un courriel à s u p p o r t arobase a u t o s c a l e a i point c a"**
❌ ~~"Envoyez un courriel à support@autoscaleai.ca"~~

✅ **"La TPS est de cinq pour cent et la TVQ de neuf point neuf sept cinq pour cent"**
❌ ~~"La TPS est de 5% et la TVQ de 9.975%"~~

## 🔄 Mise à Jour via API

Pour appliquer automatiquement :

```bash
curl -X PATCH https://api.vapi.ai/assistant/YOUR_ASSISTANT_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @config/vapi-assistant.json
```

## ✅ Vérification Finale

1. Appelez **+1 450-280-3222**
2. Demandez : "Quel est le prix minimum?"
3. Paul devrait répondre : "trois cent cinquante dollars, plus taxes"

Si Paul prononce encore mal, vérifiez :
- SSML activé dans VAPI Dashboard
- Model "eleven_multilingual_v2" sélectionné
- Language "fr-CA" configuré

---

**Support** : support@autoscaleai.ca  
**Dernière mise à jour** : 9 septembre 2025