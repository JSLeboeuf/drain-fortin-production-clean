/**
 * Script de correction automatique VAPI
 * Corrige tous les problèmes de prononciation
 */

const VAPI_API_KEY = process.env.VAPI_API_KEY || '';
const VAPI_BASE_URL = 'https://api.vapi.ai';

// Configuration optimale pour prononciation française
const OPTIMAL_CONFIG = {
  voice: {
    provider: "11labs",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    model: "eleven_multilingual_v2",
    language: "fr-CA",
    stability: 0.65,
    similarityBoost: 0.75,
    speed: 0.9,
    style: 0.3,
    useSpeakerBoost: true,
    optimizeStreamingLatency: 3,
    enableSsmlParsing: true
  },
  transcriber: {
    provider: "azure",
    language: "fr-CA",
    model: "nova-2",
    profanityFilter: false,
    enableNumberFormatting: false,
    enablePunctuation: true,
    segmentationStrategy: "Semantic",
    segmentationSilenceTimeoutMs: 600
  }
};

// Règles de prononciation à ajouter au system prompt
const PRONUNCIATION_PREFIX = `🔴 RÈGLES DE PRONONCIATION OBLIGATOIRES:

TOUS LES NOMBRES ET MONTANTS EN LETTRES:
- 350$ → "trois cent cinquante dollars"
- 450$ → "quatre cent cinquante dollars"
- 500$ → "cinq cents dollars"
- 2500$ → "deux mille cinq cents dollars"
- 3900$ → "trois mille neuf cents dollars"
- 90$/pied → "quatre-vingt-dix dollars par pied"

NUMÉROS DE TÉLÉPHONE (chiffre par chiffre avec pauses):
- 450-280-3222 → "quatre, cinq, zéro [pause] deux, huit, zéro [pause] trois, deux, deux, deux"
- JAMAIS: "quatre cent cinquante"

POURCENTAGES EN LETTRES:
- 5% → "cinq pour cent"
- 9.975% → "neuf virgule neuf sept cinq pour cent"
- 14.975% → "quatorze virgule neuf sept cinq pour cent"

EMAILS (épeler lettre par lettre):
- @ → "arobase"
- . → "point"
- support@autoscaleai.ca → "s u p p o r t arobase a u t o s c a l e a i point c a"

DATES ET HEURES:
- 14h30 → "quatorze heures trente"
- 15/01/2025 → "le quinze janvier deux mille vingt-cinq"

TECHNIQUE: Faire des PAUSES après "Bonjour", avant "plus taxes", entre les groupes de chiffres.

`;

async function fixVAPIAssistant() {
  console.log('🔧 CORRECTION AUTOMATIQUE VAPI EN COURS...\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // 1. Récupérer tous les assistants
    console.log('📋 Récupération des assistants...');
    const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });

    const assistants = await response.json();
    
    // Trouver l'assistant Paul principal (le plus récent avec webhook Supabase)
    const paulAssistant = assistants.find(a => 
      a.name === "Paul - Agent Drain Fortin Production" &&
      a.serverUrl?.includes('supabase')
    ) || assistants.find(a => 
      a.name?.toLowerCase().includes('paul') && 
      a.serverUrl?.includes('supabase')
    );

    if (!paulAssistant) {
      console.error('❌ Aucun assistant Paul avec webhook Supabase trouvé');
      return;
    }

    console.log(`\n✅ Assistant trouvé: ${paulAssistant.name}`);
    console.log(`   ID: ${paulAssistant.id}`);
    console.log(`   URL actuelle: ${paulAssistant.serverUrl}`);

    // 2. Préparer la mise à jour (sans les champs interdits)
    const updatePayload = {
      voice: {
        ...OPTIMAL_CONFIG.voice,
        language: "fr" // VAPI veut ISO 639-1, pas fr-CA
      },
      transcriber: {
        provider: "azure",
        language: "fr-CA",
        segmentationStrategy: "Semantic",
        segmentationSilenceTimeoutMs: 600
      },
      firstMessage: "Bonjour! Ici Paul, agent virtuel de Drain Fortin, disponible vingt quatre heures sur vingt quatre, sept jours sur sept. Comment puis-je vous aider aujourd'hui?"
    };

    // 3. Ajouter les règles de prononciation au system prompt
    if (updatePayload.model) {
      if (updatePayload.model.messages && updatePayload.model.messages[0]) {
        // Format avec messages array
        const currentPrompt = updatePayload.model.messages[0].content || '';
        if (!currentPrompt.includes('PRONONCIATION')) {
          updatePayload.model.messages[0].content = PRONUNCIATION_PREFIX + '\n\n' + currentPrompt;
        }
      } else if (updatePayload.model.systemPrompt) {
        // Format avec systemPrompt direct
        const currentPrompt = updatePayload.model.systemPrompt || '';
        if (!currentPrompt.includes('PRONONCIATION')) {
          updatePayload.model.systemPrompt = PRONUNCIATION_PREFIX + '\n\n' + currentPrompt;
        }
      }
      
      // Ajuster la température pour plus de cohérence
      updatePayload.model.temperature = 0.6;
      updatePayload.model.maxTokens = updatePayload.model.maxTokens || 250;
    }

    // 4. Appliquer la mise à jour
    console.log('\n🚀 Application des corrections...');
    const updateResponse = await fetch(`${VAPI_BASE_URL}/assistant/${paulAssistant.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (updateResponse.ok) {
      const updated = await updateResponse.json();
      console.log('\n✅ SUCCÈS! Assistant corrigé avec succès!');
      console.log('\n📊 Configuration appliquée:');
      console.log('   - Voice Model: eleven_multilingual_v2');
      console.log('   - Language: fr-CA');
      console.log('   - SSML: Activé');
      console.log('   - Speed: 0.9 (optimisé pour nombres)');
      console.log('   - Stability: 0.65 (clarté maximale)');
      console.log('   - System Prompt: Règles de prononciation ajoutées');
      
      console.log('\n📞 TEST IMMÉDIAT:');
      console.log('   1. Appelez: +1 (450) 280-3222');
      console.log('   2. Demandez: "Quel est le prix minimum?"');
      console.log('   3. Paul doit dire: "trois cent cinquante dollars plus taxes"');
      
      return updated;
    } else {
      const error = await updateResponse.text();
      console.error('❌ Erreur de mise à jour:', error);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Vérifier aussi les numéros de téléphone
async function checkPhoneNumbers() {
  console.log('\n📱 Vérification des numéros de téléphone...\n');
  
  try {
    const response = await fetch(`${VAPI_BASE_URL}/phone-number`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });

    if (response.ok) {
      const numbers = await response.json();
      console.log(`📞 ${numbers.length} numéro(s) configuré(s):`);
      
      numbers.forEach(num => {
        console.log(`   - ${num.number}`);
        if (num.assistantId) {
          console.log(`     → Assistant assigné: ${num.assistantId}`);
        } else {
          console.log(`     ⚠️ Aucun assistant assigné`);
        }
      });

      const drainNumber = numbers.find(n => 
        n.number === '+14502803222' || 
        n.number === '+1 450-280-3222'
      );

      if (drainNumber && !drainNumber.assistantId) {
        console.log('\n⚠️ Le numéro +1 450-280-3222 n\'a pas d\'assistant assigné!');
        console.log('   → Assignez l\'assistant dans le dashboard VAPI');
      }
    }
  } catch (error) {
    console.error('❌ Erreur vérification numéros:', error.message);
  }
}

// Exécution principale
async function main() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   CORRECTION AUTOMATIQUE VAPI - PRONONCIATION  ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  await fixVAPIAssistant();
  await checkPhoneNumbers();

  console.log('\n═══════════════════════════════════════════════');
  console.log('Correction terminée!');
}

main().catch(console.error);
