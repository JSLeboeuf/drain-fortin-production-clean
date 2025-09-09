# 📱 Exemples de SMS - Système VAPI Drain Fortin

## 🚨 SMS d'Urgence (Priorité P1)

### Inondation/Refoulement
```
🚨 URGENCE Drain Fortin
Refoulement détecté à votre adresse.
Technicien dispatché - Arrivée: 30 min
Ref: DF-2025-001
Confirmez au 514-529-6037
```

### Urgence Municipale (P2)
```
⚠️ PRIORITÉ Drain Fortin
Intervention municipale requise
Technicien: Jean-Pierre
ETA: 2h maximum
Info: 514-529-6037
```

## 📅 SMS de Rendez-vous

### Confirmation
```
✅ Drain Fortin - Confirmation
RDV: Demain 14h00
Service: Débouchage avec caméra
Technicien: Marc
Annuler: Répondez STOP
```

### Rappel (24h avant)
```
📅 Rappel - Drain Fortin
Votre RDV est demain à 14h00
Service: Inspection caméra
Prix estimé: 350-450$ +tx
Questions? 514-529-6037
```

## 💰 SMS de Tarification

### Estimation
```
💵 Drain Fortin - Estimation
Service: Racines et alésage
Prix: 450-750$ plus taxes
Frais Rive-Sud: +100$
Confirmer: OUI ou appeler 514-529-6037
```

## 🔧 SMS de Suivi

### En route
```
🚗 Drain Fortin
Technicien en route!
Arrivée prévue: 15 min
Nom: Pierre Tremblay
Cell: 514-XXX-XXXX
```

### Travaux complétés
```
✅ Drain Fortin - Complété
Service effectué avec succès
Facture: #2025-0123
Montant: 425.00$ +tx
Paiement: Interac/Carte/Chèque
Merci!
```

## 📊 Format Technique VAPI

### Structure JSON pour l'envoi
```json
{
  "function": "sendSMSAlert",
  "arguments": {
    "phoneNumbers": ["+14502803222"],
    "priority": "P1",
    "message": "Message ici (max 160 caractères)"
  }
}
```

## ⚠️ Note Importante

**Erreur Twilio actuelle**: Les credentials Twilio doivent être vérifiés:
- Account SID: YOUR_TWILIO_ACCOUNT_SID
- Auth Token: À valider dans Twilio Console
- Numéro source: +15145296037

Pour activer les SMS:
1. Vérifier les credentials dans Twilio Console
2. Mettre à jour dans Supabase secrets
3. Tester avec un numéro vérifié

---

## 📞 Numéros de Test

- Production: +15145296037 (Drain Fortin)
- Test client: +14502803222 (Votre numéro)

## 🔐 Configuration Webhook

URL: `https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook`

Le webhook peut recevoir les appels VAPI et déclencher automatiquement les SMS selon les règles:
- P1 (Inondation): SMS immédiat
- P2 (Municipal): SMS dans les 5 minutes
- P3-P4: SMS optionnel selon configuration