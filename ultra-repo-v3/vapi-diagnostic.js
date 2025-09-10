/**
 * Diagnostic Complet VAPI - Vérification de tous les paramètres
 * Identifie et corrige les problèmes de prononciation
 */

const VAPI_API_KEY = '88c0382e-069c-4ec3-b8a9-5fae174c0d7e';
const VAPI_BASE_URL = 'https://api.vapi.ai';

// Configuration de prononciation optimale
const PRONUNCIATION_CONFIG = {
  voice: {
    provider: "11labs",
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam
    model: "eleven_multilingual_v2",  // ⚠️ CRITIQUE pour le français
    language: "fr-CA",                 // ⚠️ CRITIQUE pour les nombres
    stability: 0.65,                   // Plus stable pour nombres
    similarityBoost: 0.75,
    useSpeakerBoost: true,
    optimizeStreamingLatency: 3,
    enableSsmlParsing: true,           // ⚠️ CRITIQUE pour SSML
    style: 0.3,                        // Réduire pour clarté
    speed: 0.9                         // Ralentir légèrement
  },
  transcriber: {
    provider: "azure",
    language: "fr-CA",
    model: "nova-2",
    profanityFilter: false,
    enableNumberFormatting: false,    // ⚠️ IMPORTANT: désactiver
    enablePunctuation: true,
    segmentationStrategy: "Semantic"
  }
};

// Règles de prononciation pour le system prompt
const PRONUNCIATION_RULES = `
🔴 RÈGLES DE PRONONCIATION OBLIGATOIRES (CRITIQUE):

1. PRIX ET MONTANTS - TOUJOURS EN LETTRES:
   ❌ JAMAIS: "350$", "350 dollars"
   ✅ TOUJOURS: "trois cent cinquante dollars"
   
   Exemples obligatoires:
   - 350$ → "trois cent cinquante dollars"
   - 450$ → "quatre cent cinquante dollars"
   - 500$ → "cinq cents dollars"
   - 2500$ → "deux mille cinq cents dollars"
   - 3900$ → "trois mille neuf cents dollars"
   - 90$/pied → "quatre-vingt-dix dollars par pied"

2. NUMÉROS DE TÉLÉPHONE - CHIFFRE PAR CHIFFRE:
   ❌ JAMAIS: "quatre cent cinquante, deux cent quatre-vingt"
   ✅ TOUJOURS: "quatre, cinq, zéro... pause... deux, huit, zéro... pause... trois, deux, deux, deux"
   
   Format obligatoire avec pauses:
   450-280-3222 → "quatre, cinq, zéro [pause] deux, huit, zéro [pause] trois, deux, deux, deux"

3. POURCENTAGES - EN TOUTES LETTRES:
   ❌ JAMAIS: "5%", "9.975%"
   ✅ TOUJOURS: "cinq pour cent", "neuf virgule neuf sept cinq pour cent"
   
   - TPS 5% → "TPS de cinq pour cent"
   - TVQ 9.975% → "TVQ de neuf virgule neuf sept cinq pour cent"
   - Total taxes 14.975% → "taxes totales de quatorze virgule neuf sept cinq pour cent"

4. ADRESSES EMAIL - ÉPELER LETTRE PAR LETTRE:
   ❌ JAMAIS: "support@autoscaleai.ca"
   ✅ TOUJOURS: "s, u, p, p, o, r, t, arobase, a, u, t, o, s, c, a, l, e, a, i, point, c, a"

5. HEURES ET DATES - FORMAT PARLÉ:
   ❌ JAMAIS: "14h30", "15/01/2025"
   ✅ TOUJOURS: "quatorze heures trente", "le quinze janvier deux mille vingt-cinq"

6. TECHNIQUE DE PRONONCIATION:
   - Faire une PAUSE après "Bonjour"
   - Faire une PAUSE avant "plus taxes"
   - RALENTIR pour les nombres
   - ARTICULER chaque chiffre séparément
   - Ne JAMAIS grouper les chiffres

VALIDATION: Après chaque prix, TOUJOURS le répéter en lettres pour confirmation.
Exemple: "Le prix est de trois cent cinquante dollars, je répète, trois cent cinquante dollars plus taxes."
`;

// Diagnostic de l'assistant
async function diagnosticAssistant() {
  console.log('🔍 DIAGNOSTIC COMPLET VAPI\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // 1. Récupérer tous les assistants
    const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });

    const assistants = await response.json();
    
    console.log(`📊 ${assistants.length} assistants trouvés\n`);

    // Trouver l'assistant Paul principal
    const paulAssistants = assistants.filter(a => 
      a.name.toLowerCase().includes('paul') || 
      a.name.toLowerCase().includes('drain')
    );

    console.log(`🎯 ${paulAssistants.length} assistants Paul/Drain Fortin trouvés:\n`);

    // Analyser chaque assistant Paul
    for (const assistant of paulAssistants) {
      console.log(`\n📋 Assistant: ${assistant.name}`);
      console.log(`   ID: ${assistant.id}`);
      console.log(`   Créé: ${new Date(assistant.createdAt).toLocaleString('fr-CA')}`);
      console.log(`   Modifié: ${new Date(assistant.updatedAt).toLocaleString('fr-CA')}`);
      
      console.log('\n   🎤 Configuration Voix:');
      const voice = assistant.voice || {};
      
      // Vérifier les paramètres critiques pour la prononciation
      const issues = [];
      
      // Provider
      console.log(`   - Provider: ${voice.provider || '❌ NON DÉFINI'}`);
      if (voice.provider !== '11labs') {
        issues.push('⚠️ Provider devrait être 11labs pour meilleure qualité française');
      }

      // Model
      console.log(`   - Model: ${voice.model || '❌ NON DÉFINI'}`);
      if (voice.model !== 'eleven_multilingual_v2') {
        issues.push('🔴 CRITIQUE: Model doit être eleven_multilingual_v2 pour le français');
      }

      // Language
      console.log(`   - Language: ${voice.language || '❌ NON DÉFINI'}`);
      if (!voice.language || voice.language !== 'fr-CA') {
        issues.push('🔴 CRITIQUE: Language doit être fr-CA pour prononciation française');
      }

      // SSML
      console.log(`   - SSML Parsing: ${voice.enableSsmlParsing || false}`);
      if (!voice.enableSsmlParsing) {
        issues.push('🔴 CRITIQUE: SSML doit être activé pour contrôler la prononciation');
      }

      // Voice ID
      console.log(`   - Voice ID: ${voice.voiceId || '❌ NON DÉFINI'}`);
      
      // Speed
      console.log(`   - Speed: ${voice.speed || 'default'}`);
      if (!voice.speed || voice.speed > 1) {
        issues.push('⚠️ Speed devrait être ≤0.9 pour meilleure clarté des nombres');
      }

      // Stability
      console.log(`   - Stability: ${voice.stability || 'default'}`);
      if (!voice.stability || voice.stability < 0.6) {
        issues.push('⚠️ Stability devrait être ≥0.65 pour nombres stables');
      }

      console.log('\n   📝 Configuration Transcriber:');
      const transcriber = assistant.transcriber || {};
      
      // Transcriber language
      console.log(`   - Language: ${transcriber.language || '❌ NON DÉFINI'}`);
      if (!transcriber.language || transcriber.language !== 'fr-CA') {
        issues.push('⚠️ Transcriber language devrait être fr-CA');
      }

      // Model configuration
      console.log('\n   🤖 Configuration Model:');
      const model = assistant.model || {};
      console.log(`   - Provider: ${model.provider}`);
      console.log(`   - Model: ${model.model}`);
      console.log(`   - Temperature: ${model.temperature}`);

      // Vérifier le system prompt
      console.log('\n   📜 System Prompt:');
      let hasPrononciationRules = false;
      
      if (model.messages && model.messages[0]) {
        const systemPrompt = model.messages[0].content || '';
        
        // Vérifier la présence de règles de prononciation
        hasPrononciationRules = 
          systemPrompt.includes('trois cent cinquante') ||
          systemPrompt.includes('toutes lettres') ||
          systemPrompt.includes('prononciation') ||
          systemPrompt.includes('PRONONCIATION');
        
        console.log(`   - Longueur: ${systemPrompt.length} caractères`);
        console.log(`   - Règles prononciation: ${hasPrononciationRules ? '✅ OUI' : '❌ NON'}`);
        
        if (!hasPrononciationRules) {
          issues.push('🔴 CRITIQUE: System prompt manque les règles de prononciation des nombres');
        }
      } else if (model.systemPrompt) {
        const systemPrompt = model.systemPrompt || '';
        hasPrononciationRules = 
          systemPrompt.includes('trois cent cinquante') ||
          systemPrompt.includes('toutes lettres');
        
        console.log(`   - Longueur: ${systemPrompt.length} caractères`);
        console.log(`   - Règles prononciation: ${hasPrononciationRules ? '✅ OUI' : '❌ NON'}`);
        
        if (!hasPrononciationRules) {
          issues.push('🔴 CRITIQUE: System prompt manque les règles de prononciation');
        }
      }

      // Autres paramètres
      console.log('\n   ⚙️ Autres Paramètres:');
      console.log(`   - First Message: ${assistant.firstMessage ? '✅' : '❌'}`);
      console.log(`   - Server URL: ${assistant.serverUrl || '❌ NON DÉFINI'}`);
      console.log(`   - Max Duration: ${assistant.maxDurationSeconds || 'default'} secondes`);

      // Afficher les problèmes trouvés
      if (issues.length > 0) {
        console.log('\n   ❌ PROBLÈMES DÉTECTÉS:');
        issues.forEach(issue => console.log(`      ${issue}`));
      } else {
        console.log('\n   ✅ Configuration semble correcte!');
      }

      console.log('\n   ─────────────────────────────────────');
    }

    // Recommandations finales
    console.log('\n\n🔧 CORRECTIONS RECOMMANDÉES:');
    console.log('═══════════════════════════════════════════\n');
    
    console.log('1. VOICE SETTINGS (Critique pour prononciation):');
    console.log('   ```json');
    console.log(JSON.stringify(PRONUNCIATION_CONFIG.voice, null, 2));
    console.log('   ```\n');

    console.log('2. TRANSCRIBER SETTINGS:');
    console.log('   ```json');
    console.log(JSON.stringify(PRONUNCIATION_CONFIG.transcriber, null, 2));
    console.log('   ```\n');

    console.log('3. SYSTEM PROMPT (Ajouter au début):');
    console.log('   ```');
    console.log(PRONUNCIATION_RULES);
    console.log('   ```\n');

    console.log('4. ACTIONS IMMÉDIATES:');
    console.log('   1. Aller dans https://dashboard.vapi.ai/assistants');
    console.log('   2. Éditer l\'assistant Paul principal');
    console.log('   3. Copier-coller les configurations ci-dessus');
    console.log('   4. Sauvegarder et tester immédiatement');
    console.log('\n');

    console.log('5. TEST DE VALIDATION:');
    console.log('   Appeler et dire: "Quel est le prix minimum?"');
    console.log('   ✅ Réponse attendue: "trois cent cinquante dollars plus taxes"');
    console.log('   ❌ Si vous entendez: "350 dollars" → Configuration incorrecte');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction pour corriger automatiquement un assistant
async function fixAssistant(assistantId) {
  console.log('\n🔧 CORRECTION AUTOMATIQUE EN COURS...\n');

  const updatePayload = {
    voice: PRONUNCIATION_CONFIG.voice,
    transcriber: PRONUNCIATION_CONFIG.transcriber,
    // Note: Le system prompt doit être mis à jour manuellement dans le dashboard
  };

  try {
    const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (response.ok) {
      console.log('✅ Assistant mis à jour avec succès!');
      console.log('⚠️ N\'oubliez pas de mettre à jour le SYSTEM PROMPT manuellement dans le dashboard!');
    } else {
      console.error('❌ Erreur de mise à jour:', await response.text());
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécution
console.clear();
console.log('╔═══════════════════════════════════════════╗');
console.log('║   DIAGNOSTIC COMPLET VAPI - PRONONCIATION ║');
console.log('╚═══════════════════════════════════════════╝\n');

diagnosticAssistant().then(() => {
  console.log('\n═══════════════════════════════════════════');
  console.log('Diagnostic terminé.');
  
  // Si vous voulez corriger automatiquement, décommentez:
  // const assistantId = 'c707f6a1-e53b-4cb3-be75-e9f958a36a35'; // ID de Paul DrainFortin v4.2
  // fixAssistant(assistantId);
});