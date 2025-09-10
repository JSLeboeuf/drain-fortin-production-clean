# 📞 Simulation d'Appel - Guillaume (450-280-3222)

## 🎭 Scénario: Guillaume appelle pour une urgence

### 1️⃣ Guillaume compose le +1 (514) 529-6037

**Paul (Agent VAPI)**: "Bonjour! Ici Paul de Drain Fortin. Comment puis-je vous aider aujourd'hui?"

**Guillaume**: "Oui bonjour, j'ai de l'eau qui remonte dans mon sous-sol!"

### 2️⃣ Identification de l'urgence

**Paul**: "Oh non! Un refoulement, c'est une urgence. Pouvez-vous me donner votre adresse?"

**Guillaume**: "Je suis au 123 rue Principale à Brossard"

### 3️⃣ Classification automatique

**Système VAPI** déclenche automatiquement:
```json
{
  "function": "classifyPriority",
  "arguments": {
    "description": "refoulement sous-sol",
    "location": "Brossard"
  }
}
```

**Résultat**: Priorité P1 (Urgence immédiate)

### 4️⃣ SMS automatique envoyé à Guillaume

📱 **SMS envoyé au 450-280-3222**:
```
🚨 URGENCE Drain Fortin
Refoulement confirmé - Brossard
Technicien: Marc Tremblay
Arrivée: 30 minutes MAX
Ref: DF-2025-1730
Urgence? 514-529-6037
```

### 5️⃣ Confirmation vocale

**Paul**: "Parfait M. Guillaume! J'ai dispatché notre technicien Marc Tremblay. Il sera chez vous dans maximum 30 minutes. Vous allez recevoir un SMS de confirmation au 450-280-3222. Le prix pour un débouchage d'urgence est entre 350$ et 650$ plus taxes, avec un supplément de 100$ pour la Rive-Sud."

### 6️⃣ Dashboard en temps réel

**Sur le dashboard admin**:
- 🔴 Nouvelle urgence P1
- 📍 Brossard - Rive-Sud
- ⏱️ SLA: 30 minutes
- 📱 Client: Guillaume (450-280-3222)
- 💰 Estimation: 450-750$ + taxes

### 7️⃣ SMS de suivi (15 min plus tard)

📱 **SMS au 450-280-3222**:
```
🚗 Drain Fortin Update
Marc est en route!
ETA: 15 minutes
Plaque: DRN-001
Cell technicien: 514-XXX-XXXX
```

### 8️⃣ Après l'intervention

📱 **SMS final au 450-280-3222**:
```
✅ Drain Fortin - Complété
Service: Débouchage urgent
Montant: 525.00$ + taxes
Paiement: Interac/Carte
Merci Guillaume!
Facture: #DF-2025-1730
```

---

## 🔧 Configuration pour activer ce flow

### Twilio (À corriger)
- **Problème actuel**: Auth Token invalide
- **Solution**: Obtenir le bon token depuis console.twilio.com
- **Numéro SMS**: Le même que l'appel (+15145296037)

### VAPI Assistant
- Webhook URL: `https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook`
- Functions activées: sendSMSAlert, classifyPriority, calculateQuote

### Test immédiat (sans Twilio)
Pour tester le système sans SMS:
1. Appelez le numéro VAPI configuré
2. Dites "J'ai une inondation"
3. Le webhook classifiera en P1
4. Le dashboard affichera l'alerte
5. Les SMS seront loggés (mais pas envoyés tant que Twilio n'est pas fixé)

---

## 📊 Ce que Guillaume voit/reçoit

1. **Appel**: Réponse en <2 secondes
2. **Voix naturelle**: Paul parle français québécois
3. **SMS instantanés**: Confirmation, suivi, facture
4. **Transparence**: Prix annoncés clairement
5. **Rapidité**: Technicien en 30 min pour P1

## ⚠️ Note importante

**Pour activer les SMS réels à Guillaume (450-280-3222)**:
1. Obtenir le BON Auth Token Twilio
2. Le mettre à jour dans Supabase
3. Vérifier que le numéro Twilio (+15145296037) est actif
4. Tester avec un appel réel