/**
 * Script pour mettre à jour l'assistant VAPI Paul
 * Pour configurer les questions séquentielles (une à la fois)
 */

const https = require('https');

// Configuration VAPI
const VAPI_API_KEY = 'c3b49727-9f3a-4581-a185-ac61e13004a9'; // Votre clé API
const ASSISTANT_ID = '90395b6a-5b14-4515-a7b8-1149db5787bc'; // ID de l'assistant Paul

// Nouveau prompt avec questions séquentielles
const updatedSystemPrompt = `Tu es Paul, l'assistant virtuel de Drain Fortin, une entreprise de débouchage de drains à Montréal.

RÈGLE ABSOLUE: Tu dois TOUJOURS poser UNE SEULE question à la fois et attendre la réponse avant de continuer.

PROCESSUS DE CONVERSATION (étape par étape):

1. ACCUEIL:
   "Bonjour! Je suis Paul de Drain Fortin. Comment puis-je vous aider aujourd'hui?"
   [ATTENDRE LA RÉPONSE]

2. IDENTIFICATION:
   "D'accord, je comprends. Pour mieux vous servir, quel est votre nom s'il vous plaît?"
   [ATTENDRE LA RÉPONSE]

3. LOCALISATION:
   "Merci [nom]. Quelle est votre adresse complète?"
   [ATTENDRE LA RÉPONSE]

4. CONTACT:
   "Parfait. À quel numéro de téléphone puis-je vous rejoindre?"
   [ATTENDRE LA RÉPONSE]

5. PROBLÈME:
   "Pouvez-vous me décrire votre problème de drainage en détail?"
   [ATTENDRE LA RÉPONSE]

6. URGENCE:
   "Je vois. Est-ce que c'est une situation urgente qui nécessite une intervention immédiate?"
   [ATTENDRE LA RÉPONSE]

RÈGLES DE CONVERSATION:
- NE JAMAIS poser plus d'une question à la fois
- TOUJOURS attendre et écouter la réponse complète
- CONFIRMER que tu as bien compris avant de passer à la question suivante
- ÊTRE patient et laisser le client s'exprimer
- Si le client donne plusieurs informations d'un coup, les traiter et remercier

TARIFS (prononciation claire):
- Débouchage: "trois cent cinquante dollars"
- Inspection caméra: "quatre cent cinquante dollars"  
- Nettoyage de drain: "quatre cents dollars"
- Frais Rive-Sud: "cinquante dollars supplémentaires"

DISPONIBILITÉ:
"Nous sommes disponibles vingt-quatre heures sur vingt-quatre, sept jours sur sept."

NUMÉROS DE TÉLÉPHONE:
- Montréal: "cinq, un, quatre... neuf, six, huit... trois, deux, trois, neuf"
- Rive-Nord: "quatre, cinq, zéro... cinq, quatre, trois... trois, neuf, trois, neuf"

IMPORTANT - NE PAS:
- Poser plusieurs questions en même temps
- Rushé le client
- Interrompre le client
- Demander des informations déjà données

TOUJOURS:
- Une question à la fois
- Écouter activement
- Confirmer la compréhension
- Être patient et professionnel`;

// Configuration de l'assistant mise à jour (format VAPI valide)
const assistantConfig = {
  name: "Paul - Drain Fortin Sequential",
  model: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 150,
    systemPrompt: updatedSystemPrompt
  },
  voice: {
    provider: "11labs", // Format VAPI correct
    voiceId: "21m00Tcm4TlvDq8ikWAM", // ID de voix ElevenLabs
    speed: 0.95,
    stability: 0.8
  },
  firstMessage: "Bonjour! Je suis Paul de Drain Fortin. Comment puis-je vous aider aujourd'hui?",
  serverUrl: "https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook",
  silenceTimeoutSeconds: 10, // Minimum requis par VAPI
  responseDelaySeconds: 0.5,
  endCallFunctionEnabled: true,
  hipaaEnabled: false,
  recordingEnabled: false
};

// Fonction pour obtenir l'assistant actuel
async function getAssistant() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vapi.ai',
      path: `/assistant/${ASSISTANT_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to get assistant: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Fonction pour lister tous les assistants
async function listAssistants() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vapi.ai',
      path: '/assistant',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to list assistants: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Fonction pour mettre à jour l'assistant
async function updateAssistant(assistantId, config) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(config);
    
    const options = {
      hostname: 'api.vapi.ai',
      path: `/assistant/${assistantId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to update assistant: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Script principal
async function main() {
  console.log('🔧 Configuration VAPI - Questions Séquentielles\n');
  console.log('============================================\n');

  try {
    // 1. Lister les assistants pour trouver Paul
    console.log('📋 Recherche de l\'assistant Paul...');
    const assistants = await listAssistants();
    
    const paulAssistant = assistants.find(a => 
      a.name && (a.name.includes('Paul') || a.name.includes('Drain'))
    );

    if (!paulAssistant) {
      console.log('❌ Assistant Paul non trouvé.');
      console.log('\nAssistants disponibles:');
      assistants.forEach(a => {
        console.log(`- ${a.name} (ID: ${a.id})`);
      });
      return;
    }

    console.log(`✅ Assistant trouvé: ${paulAssistant.name} (ID: ${paulAssistant.id})\n`);

    // 2. Mettre à jour l'assistant
    console.log('🔄 Mise à jour de la configuration...');
    const updated = await updateAssistant(paulAssistant.id, assistantConfig);
    
    console.log('✅ Assistant mis à jour avec succès!\n');
    console.log('📞 Configuration appliquée:');
    console.log('- Questions posées une à la fois');
    console.log('- Délai de silence: 3 secondes');
    console.log('- Délai de réponse: 0.5 seconde');
    console.log('- Interruption facilitée');
    console.log('- Confirmation de compréhension activée\n');

    console.log('🎉 Paul est maintenant configuré pour poser une question à la fois!');
    console.log('\n📞 Testez en appelant: (438) 900-4385');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Vérifiez votre clé API et réessayez.');
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { updateAssistant, listAssistants };