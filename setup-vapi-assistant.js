/**
 * Script de configuration automatique de l'assistant VAPI
 * Configure Paul avec toutes les optimisations de prononciation
 */

const VAPI_API_KEY = '88c0382e-069c-4ec3-b8a9-5fae174c0d7e';
const VAPI_BASE_URL = 'https://api.vapi.ai/v1';

// Configuration complète de l'assistant Paul
const assistantConfig = {
  name: "Paul - Drain Fortin",
  model: {
    provider: "openai",
    model: "gpt-4",
    systemPrompt: `Tu es Paul, agent virtuel de Drain Fortin disponible 24/7.

RÈGLES DE PRONONCIATION CRITIQUES:

1. NOMBRES ET PRIX:
   - Toujours dire les nombres en toutes lettres
   - 350$ = "trois cent cinquante dollars"
   - Plus taxes = dire "plus taxes" avec une pause avant
   - Exemple: "Le prix minimum est de trois cent cinquante dollars, plus taxes"

2. NUMÉROS DE TÉLÉPHONE:
   - Épeler chiffre par chiffre avec pauses
   - Format: "quatre, cinq, zéro... deux, huit, zéro... trois, deux, deux, deux"
   - Jamais dire "quatre cent cinquante"

3. ADRESSES EMAIL:
   - Épeler lettre par lettre
   - @ = "arobase"
   - . = "point"
   - support@autoscaleai.ca = "s u p p o r t arobase a u t o s c a l e a i point c a"

4. POURCENTAGES:
   - TPS: "cinq pour cent"
   - TVQ: "neuf point neuf sept cinq pour cent"

5. DATES ET HEURES:
   - Dates: "le quinze janvier deux mille vingt-cinq"
   - Heures: "quatorze heures trente" PAS "14h30"

CONTRAINTES GUILLAUME (156 règles):

1. Prix minimum: 350$ + taxes
2. Surcharge Rive-Sud: +100$ pour Brossard, Longueuil, Boucherville
3. Services acceptés: débouchage, inspection caméra, réparation drain
4. Services refusés: plomberie générale, toiture, électricité
5. Urgences P1: réponse 1h, SMS au propriétaire
6. Urgences P2: réponse 4h, SMS équipe
7. Urgences P3: réponse 24h
8. Urgences P4: réponse 48h

Tu dois TOUJOURS:
- Parler en français québécois
- Être poli et professionnel
- Prendre les informations du client
- Calculer le devis selon les règles
- Envoyer les alertes SMS selon la priorité`,
    temperature: 0.7,
    maxTokens: 250
  },
  voice: {
    provider: "11labs",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    model: "eleven_multilingual_v2",
    language: "fr-CA",
    stability: 0.65,
    similarityBoost: 0.75,
    enableSsmlParsing: true
  },
  transcriber: {
    provider: "azure",
    language: "fr-CA",
    model: "nova-2"
  },
  firstMessage: "Bonjour! Ici Paul, agent virtuel de Drain Fortin, disponible vingt quatre heures sur vingt quatre, sept jours sur sept. Comment puis-je vous aider aujourd'hui?",
  serverUrl: "https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook",
  serverUrlSecret: "drain-fortin-webhook-secret-2025"
};

// Fonctions métier
const functions = [
  {
    name: "validateServiceRequest",
    description: "Valide si le service demandé est offert par Drain Fortin",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Type de service demandé"
        }
      },
      required: ["service"]
    }
  },
  {
    name: "calculateQuote",
    description: "Calcule un devis selon les contraintes Guillaume",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Type de service"
        },
        location: {
          type: "string",
          description: "Ville ou adresse"
        },
        urgency: {
          type: "string",
          enum: ["P1", "P2", "P3", "P4"],
          description: "Niveau d'urgence"
        }
      },
      required: ["service", "location"]
    }
  },
  {
    name: "sendSMSAlert",
    description: "Envoie une alerte SMS selon la priorité",
    parameters: {
      type: "object",
      properties: {
        priority: {
          type: "string",
          enum: ["P1", "P2", "P3", "P4"]
        },
        message: {
          type: "string",
          description: "Message à envoyer"
        },
        clientPhone: {
          type: "string",
          description: "Numéro du client"
        }
      },
      required: ["priority", "message"]
    }
  }
];

// Créer ou mettre à jour l'assistant
async function setupAssistant() {
  console.log('🚀 Configuration de l\'assistant VAPI Paul...\n');

  try {
    // 1. Créer l'assistant
    console.log('📝 Création de l\'assistant...');
    const createResponse = await fetch(`${VAPI_BASE_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...assistantConfig,
        functions: functions
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('❌ Erreur création assistant:', error);
      
      // Si l'assistant existe déjà, essayer de le mettre à jour
      console.log('🔄 Tentative de mise à jour...');
      
      // Récupérer la liste des assistants
      const listResponse = await fetch(`${VAPI_BASE_URL}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`
        }
      });
      
      const assistants = await listResponse.json();
      const paul = assistants.find(a => a.name === "Paul - Drain Fortin");
      
      if (paul) {
        // Mettre à jour l'assistant existant
        const updateResponse = await fetch(`${VAPI_BASE_URL}/assistant/${paul.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...assistantConfig,
            functions: functions
          })
        });
        
        if (updateResponse.ok) {
          console.log('✅ Assistant mis à jour avec succès!');
          console.log('🆔 Assistant ID:', paul.id);
        } else {
          console.error('❌ Échec de la mise à jour:', await updateResponse.text());
        }
      }
    } else {
      const assistant = await createResponse.json();
      console.log('✅ Assistant créé avec succès!');
      console.log('🆔 Assistant ID:', assistant.id);
    }

    // 2. Configurer le numéro de téléphone
    console.log('\n📞 Configuration du numéro de téléphone...');
    
    // Obtenir la liste des numéros
    const numbersResponse = await fetch(`${VAPI_BASE_URL}/phone-number`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });

    if (numbersResponse.ok) {
      const numbers = await numbersResponse.json();
      console.log(`📱 ${numbers.length} numéro(s) trouvé(s)`);
      
      // Afficher les numéros disponibles
      numbers.forEach(num => {
        console.log(`  - ${num.number} (${num.provider})`);
      });
      
      // Chercher le numéro +14502803222
      const drainFortinNumber = numbers.find(n => n.number === '+14502803222');
      
      if (drainFortinNumber) {
        console.log('✅ Numéro Drain Fortin trouvé!');
        
        // Assigner l'assistant au numéro
        const assignResponse = await fetch(`${VAPI_BASE_URL}/phone-number/${drainFortinNumber.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assistantId: paul?.id || assistant?.id
          })
        });
        
        if (assignResponse.ok) {
          console.log('✅ Assistant assigné au numéro!');
        } else {
          console.log('⚠️ Impossible d\'assigner l\'assistant:', await assignResponse.text());
        }
      } else {
        console.log('⚠️ Numéro +1 450-280-3222 non trouvé dans VAPI');
        console.log('👉 Veuillez ajouter ce numéro dans le dashboard VAPI');
      }
    }

    console.log('\n✨ Configuration terminée!');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Vérifiez dans le dashboard VAPI: https://dashboard.vapi.ai');
    console.log('2. Testez en appelant: +1 (450) 280-3222');
    console.log('3. Vérifiez les logs dans Supabase');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Tester la connexion VAPI
async function testConnection() {
  console.log('🔍 Test de connexion VAPI...\n');
  
  try {
    const response = await fetch(`${VAPI_BASE_URL}/account`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });

    if (response.ok) {
      const account = await response.json();
      console.log('✅ Connexion VAPI réussie!');
      console.log('📊 Compte:', account.name || account.email);
      console.log('💰 Crédits:', account.credits || 'N/A');
      return true;
    } else {
      console.error('❌ Erreur de connexion:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    return false;
  }
}

// Exécution principale
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   Configuration Assistant VAPI - Paul     ');
  console.log('   Drain Fortin Centre d\'Appels IA        ');
  console.log('═══════════════════════════════════════════\n');

  // Tester la connexion
  const connected = await testConnection();
  
  if (connected) {
    console.log('\n───────────────────────────────────────────\n');
    await setupAssistant();
  } else {
    console.log('\n❌ Impossible de se connecter à VAPI');
    console.log('Vérifiez votre clé API: 88c0382e-069c-4ec3-b8a9-5fae174c0d7e');
  }

  console.log('\n═══════════════════════════════════════════');
}

// Lancer le script
main().catch(console.error);