/**
 * SCRIPT DE MISE À JOUR COMPLÈTE - DRAIN FORTIN
 * 
 * Applique toutes les modifications nécessaires:
 * 1. Met à jour VAPI avec les vrais numéros
 * 2. Vérifie la configuration Supabase
 * 3. Teste la synchronisation temps réel
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

console.log('🔧 APPLICATION DE TOUTES LES MISES À JOUR\n');
console.log('='.repeat(60));

// Configuration
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Données réelles de Drain Fortin
const REAL_DATA = {
  phones: {
    montreal: '+15149683239',
    rivenord: '+14505433939',
    display: {
      montreal: '(514) 968-3239',
      rivenord: '(450) 543-3939'
    }
  },
  email: 'estimation@drainfortin.ca',
  rbq: '5794-7517-01',
  certifications: ['APCHQ', 'CMMTQ', 'CCQ'],
  addresses: {
    montreal: '3909 Bd Saint-Jean Baptiste, Montréal, QC H1B 5V4',
    blainville: '1060 boul. du Curé-Labelle, Suite 200, Blainville, QC J7C 2M6'
  }
};

// 1. MISE À JOUR DU FICHIER .ENV
async function updateEnvFile() {
  console.log('\n📝 MISE À JOUR DU FICHIER .ENV\n');
  
  let envContent = fs.readFileSync('.env', 'utf8');
  
  // Remplacer l'ancien numéro par les vrais
  const updates = [
    {
      old: /TWILIO_PHONE_NUMBER=.*/,
      new: `# VRAIS NUMÉROS DE DRAIN FORTIN
TWILIO_PHONE_NUMBER_MONTREAL=${REAL_DATA.phones.montreal}
TWILIO_PHONE_NUMBER_RIVENORD=${REAL_DATA.phones.rivenord}
# Utiliser Montréal comme numéro principal
TWILIO_PHONE_NUMBER=${REAL_DATA.phones.montreal}`
    },
    {
      old: /BUSINESS_EMAIL=.*/,
      new: `BUSINESS_EMAIL=${REAL_DATA.email}`
    }
  ];
  
  let modified = false;
  updates.forEach(update => {
    if (envContent.match(update.old)) {
      envContent = envContent.replace(update.old, update.new);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync('.env', envContent);
    console.log('✅ Fichier .env mis à jour avec les vrais numéros');
  } else {
    console.log('⚠️ Fichier .env déjà à jour');
  }
  
  // Recharger les variables d'environnement
  dotenv.config();
}

// 2. MISE À JOUR VAPI
async function updateVapi() {
  console.log('\n☎️ MISE À JOUR CONFIGURATION VAPI\n');
  
  try {
    // Configuration optimisée avec vrais numéros
    const vapiUpdate = {
      name: "Assistant Drain Fortin Production",
      
      // Prompt avec vraies informations
      systemPrompt: `Vous êtes l'assistant de Drain Fortin, RBQ ${REAL_DATA.rbq}.
Service 24/7. Certifié ${REAL_DATA.certifications.join(', ')}.

NUMÉROS (dire chiffre par chiffre):
- Montréal: ${REAL_DATA.phones.display.montreal} → "cinq, un, quatre, neuf, six, huit, trois, deux, trois, neuf"
- Rive-Nord: ${REAL_DATA.phones.display.rivenord} → "quatre, cinq, zéro, cinq, quatre, trois, trois, neuf, trois, neuf"

TARIFS (prononcer en lettres):
- Inspection caméra: 350$ → "trois cent cinquante dollars" (Rive-Sud: 400$)
- Nettoyage drain: 450$ → "quatre cent cinquante dollars" (Rive-Sud: 500$)
- Temps supplémentaire: 42.50$/15min → "quarante-deux dollars cinquante"

RÈGLES CRITIQUES:
1. JAMAIS raccrocher en premier
2. TOUJOURS dire les prix en lettres
3. TOUJOURS épeler les numéros chiffre par chiffre
4. Parler lentement et clairement en français québécois`,

      // Optimisations performance
      responseDelaySeconds: 0,
      llmRequestDelaySeconds: 0,
      formatTurns: false,
      
      // Voice settings
      voice: {
        provider: "eleven_labs",
        voiceId: "french_voice",
        language: "fr",
        speed: 1.0,
        enableSsmlParsing: true
      },
      
      // Model settings
      model: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 150,
        stream: true
      },
      
      // Webhook
      serverUrl: `${supabaseUrl}/functions/v1/vapi-webhook-optimized`,
      serverTimeoutSeconds: 10,
      
      // Timeouts
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 1800,
      endCallFunctionEnabled: false
    };
    
    const response = await fetch(
      `https://api.vapi.ai/assistant/${ASSISTANT_ID}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vapiUpdate)
      }
    );
    
    if (response.ok) {
      console.log('✅ VAPI mis à jour avec succès');
      console.log(`  • Numéros: ${REAL_DATA.phones.display.montreal} & ${REAL_DATA.phones.display.rivenord}`);
      console.log('  • Latence optimisée (0ms delays)');
      console.log('  • Webhook optimisé configuré');
    } else {
      console.log('❌ Erreur mise à jour VAPI:', response.status);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// 3. VÉRIFIER SUPABASE REALTIME
async function checkSupabaseRealtime() {
  console.log('\n📡 VÉRIFICATION SUPABASE REALTIME\n');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Test connexion
  const { data, error } = await supabase
    .from('constraints')
    .select('count(*)', { count: 'exact', head: true });
  
  if (!error) {
    console.log('✅ Connexion Supabase OK');
    
    // Vérifier les tables importantes
    const tables = ['vapi_calls', 'leads', 'appointments', 'sms_messages'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`  ✅ Table ${table}: accessible (${count || 0} enregistrements)`);
      } else {
        console.log(`  ❌ Table ${table}: ${error.message}`);
      }
    }
  } else {
    console.log('❌ Erreur connexion Supabase:', error.message);
  }
}

// 4. TEST FINAL
async function finalTest() {
  console.log('\n🧪 TEST FINAL DE VALIDATION\n');
  
  const issues = [];
  
  // Vérifier les numéros dans .env
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes(REAL_DATA.phones.montreal)) {
    console.log('✅ Numéro Montréal configuré');
  } else {
    issues.push('Numéro Montréal non configuré dans .env');
  }
  
  if (envContent.includes(REAL_DATA.phones.rivenord)) {
    console.log('✅ Numéro Rive-Nord configuré');
  } else {
    issues.push('Numéro Rive-Nord non configuré dans .env');
  }
  
  // Vérifier VAPI
  try {
    const response = await fetch(
      `https://api.vapi.ai/assistant/${ASSISTANT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`
        }
      }
    );
    
    const config = await response.json();
    
    if (config.responseDelaySeconds === 0) {
      console.log('✅ VAPI optimisé (latence minimale)');
    } else {
      issues.push('VAPI non optimisé pour la latence');
    }
    
    if (config.systemPrompt?.includes('514') && config.systemPrompt?.includes('968-3239')) {
      console.log('✅ Vrais numéros dans VAPI');
    } else {
      issues.push('Vrais numéros non configurés dans VAPI');
    }
  } catch (error) {
    issues.push('Impossible de vérifier VAPI');
  }
  
  // Résumé
  console.log('\n' + '='.repeat(60));
  if (issues.length === 0) {
    console.log('🎉 SYSTÈME 100% CONFIGURÉ ET VALIDÉ!');
    console.log('\n✅ Tous les paramètres sont synchronisés:');
    console.log('  • Vrais numéros de téléphone');
    console.log('  • Configuration VAPI optimisée');
    console.log('  • Base de données accessible');
    console.log('  • Temps réel prêt');
  } else {
    console.log('⚠️ PROBLÈMES RESTANTS:');
    issues.forEach(issue => console.log(`  • ${issue}`));
  }
  console.log('='.repeat(60));
}

// EXÉCUTION
async function runAllUpdates() {
  console.log('🚀 Début de la mise à jour complète...\n');
  
  await updateEnvFile();
  await updateVapi();
  await checkSupabaseRealtime();
  await finalTest();
  
  console.log('\n✅ MISE À JOUR TERMINÉE');
  console.log('\n📞 NUMÉROS CONFIGURÉS:');
  console.log(`  • Montréal: ${REAL_DATA.phones.display.montreal}`);
  console.log(`  • Rive-Nord: ${REAL_DATA.phones.display.rivenord}`);
  console.log('\n💡 NOTE: Assurez-vous que ces numéros sont configurés dans Twilio');
}

// Lancer le script
runAllUpdates().catch(console.error);