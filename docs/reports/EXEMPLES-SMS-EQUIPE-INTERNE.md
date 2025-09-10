# 📱 Exemples SMS pour l'Équipe Interne Drain Fortin

## Système de Classification par Urgence

Le système envoie automatiquement des SMS à l'équipe interne avec les informations du client pour permettre un rappel rapide et efficace.

## 🚨 P1 - URGENCE IMMÉDIATE (Inondation/Refoulement)

```
🚨 URGENCE IMMÉDIATE - Drain Fortin

CLIENT: Jean Tremblay
TÉL: 514-555-1234
ADRESSE: 123 rue Principale, Brossard
PROBLÈME: Refoulement d'égout dans le sous-sol
PRIORITÉ: P1

Rappeler le client rapidement.
```

**Délai de rappel**: < 5 minutes
**Action requise**: Dispatch immédiat d'un technicien

## ⚠️ P2 - PRIORITÉ MUNICIPALE

```
⚠️ PRIORITÉ MUNICIPALE - Drain Fortin

CLIENT: Ville de Longueuil
TÉL: 450-555-6789
ADRESSE: 456 boul. Saint-Laurent, Longueuil
PROBLÈME: Égout municipal bloqué près de l'école
PRIORITÉ: P2

Rappeler le client rapidement.
```

**Délai de rappel**: < 15 minutes
**Action requise**: Coordination avec les services municipaux

## 🔧 P3 - SERVICE MAJEUR (Gainage/Installation)

```
🔧 SERVICE MAJEUR - Drain Fortin

CLIENT: Marie Dubois
TÉL: 438-555-9876
ADRESSE: 789 avenue des Érables, Saint-Hubert
PROBLÈME: Installation de gainage complet
PRIORITÉ: P3

Rappeler le client rapidement.
```

**Délai de rappel**: < 1 heure
**Action requise**: Planification d'une évaluation sur place

## 📋 P4 - SERVICE STANDARD

```
📋 SERVICE STANDARD - Drain Fortin

CLIENT: Robert Gagnon
TÉL: 514-555-3456
ADRESSE: 321 rue des Pins, Montréal
PROBLÈME: Inspection caméra préventive
PRIORITÉ: P4

Rappeler le client rapidement.
```

**Délai de rappel**: < 4 heures
**Action requise**: Planification d'un rendez-vous régulier

## 🔄 Format des Arguments pour VAPI

Le webhook VAPI doit envoyer les arguments suivants à la fonction `sendSMSAlert`:

```json
{
  "function": "sendSMSAlert",
  "arguments": {
    "clientName": "Nom du client",
    "clientPhone": "Téléphone du client",
    "clientAddress": "Adresse complète",
    "problemDescription": "Description du problème",
    "priority": "P1|P2|P3|P4",
    "estimatedValue": 500
  }
}
```

## 📊 Matrice de Classification Automatique

| Mots-clés | Priorité | Emoji | Délai rappel |
|-----------|----------|-------|--------------|
| inondation, refoulement, urgence | P1 | 🚨 | < 5 min |
| municipal, ville de | P2 | ⚠️ | < 15 min |
| gainage, installation (>3000$) | P3 | 🔧 | < 1h |
| inspection, préventif, standard | P4 | 📋 | < 4h |

## 📞 Numéros de l'Équipe Interne

Ces numéros recevraient les SMS (à configurer dans les variables d'environnement):

```env
INTERNAL_TEAM_NUMBERS=+14502803222,+15145551234,+14385556789
```

## 🔧 Configuration Webhook

Le webhook analyse automatiquement le contenu de l'appel et:
1. Extrait les informations du client
2. Classifie l'urgence selon les mots-clés
3. Envoie le SMS à toute l'équipe interne
4. Log l'envoi dans Supabase

## 📈 Avantages du Système

1. **Rapidité**: L'équipe reçoit l'alerte instantanément
2. **Contexte complet**: Toutes les infos client en un SMS
3. **Priorisation claire**: Emojis et préfixes pour urgence visuelle
4. **Traçabilité**: Tous les SMS sont loggés dans la DB
5. **Flexibilité**: Facile d'ajouter/retirer des numéros d'équipe

## ⚙️ Variables d'Environnement Requises

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_FROM=+14389004385

# Internal Team Numbers (comma-separated)
INTERNAL_TEAM_NUMBERS=+14502803222
```

## 🚀 Test du Système

Pour tester, simulez un appel VAPI avec:

```bash
curl -X POST https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "function-call",
    "toolCalls": [{
      "toolCallId": "test-001",
      "function": {
        "name": "sendSMSAlert",
        "arguments": {
          "clientName": "Test Client",
          "clientPhone": "514-555-0000",
          "clientAddress": "123 rue Test, Montréal",
          "problemDescription": "Inondation sous-sol",
          "priority": "P1"
        }
      }
    }]
  }'
```

---

**Note**: Le système envoie maintenant les SMS à l'équipe interne avec les informations du client, permettant un rappel rapide et efficace selon le niveau d'urgence.