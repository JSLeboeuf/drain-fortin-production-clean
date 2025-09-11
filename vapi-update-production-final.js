/**
 * MISE À JOUR FINALE VAPI - INFORMATIONS RÉELLES DRAIN FORTIN
 * 
 * Ce script met à jour la configuration VAPI avec les vraies informations
 * de l'entreprise Drain Fortin récupérées depuis drainfortin.ca
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const VAPI_API_KEY = process.env.VAPI_API_KEY || '88c0382e-069c-4ec3-b8a9-5fae174c0d7e';
const ASSISTANT_ID = 'c707f6a1-e53b-4cb3-be75-e9f958a36a35';

console.log('🚀 MISE À JOUR FINALE VAPI - DONNÉES RÉELLES DRAIN FORTIN\n');
console.log('════════════════════════════════════════════════════════\n');

async function updateToRealData() {
  try {
    // 1. Récupérer la configuration actuelle
    console.log('📡 Récupération de la configuration actuelle...\n');
    
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Erreur: ${getResponse.status}`);
    }
    
    const currentConfig = await getResponse.json();
    
    // 2. Préparer le nouveau prompt système avec les VRAIES informations
    const realSystemPrompt = `Vous êtes l'assistant téléphonique de Drain Fortin, entreprise spécialisée en plomberie et drainage depuis plus de 25 ans.

INFORMATIONS DE L'ENTREPRISE:
- Licence RBQ: 5794-7517-01
- Certifications: APCHQ, CMMTQ, CCQ
- Service disponible 24h/7j
- Courriel: estimation@drainfortin.ca

BUREAUX:
- Montréal: 3909 Bd Saint-Jean Baptiste, Montréal, QC H1B 5V4
- Blainville: 1060 boul. du Curé-Labelle, Suite 200 bureau 1, Blainville, QC J7C 2M6

NUMÉROS DE TÉLÉPHONE (TOUJOURS dire chiffre par chiffre):
- Montréal: (514) 968-3239 → "cinq, un, quatre, neuf, six, huit, trois, deux, trois, neuf"
- Rive-Nord: (450) 543-3939 → "quatre, cinq, zéro, cinq, quatre, trois, trois, neuf, trois, neuf"

ZONES DE SERVICE:
- Grand Montréal (tarif standard)
- Laval (tarif standard)
- Lanaudière incluant Repentigny, Joliette (tarif standard)
- Laurentides incluant Blainville, Saint-Jérôme (tarif standard)
- Rive-Sud (supplément de 50$ sur tous les services)

TARIFICATION (TOUJOURS prononcer les prix en lettres):
1. INSPECTION PAR CAMÉRA:
   - Tarif standard: 350$ → "trois cent cinquante dollars"
   - Rive-Sud: 400$ → "quatre cents dollars"
   - Inclus: déplacement, caméra HD, 1 heure sur place, lien vidéo web
   - Équipement additionnel: 50$ à 100$ fixe
   - Temps supplémentaire: 42.50$/15 minutes → "quarante-deux dollars cinquante par quinze minutes"
   - Rapport écrit détaillé: 100$ → "cent dollars"

2. NETTOYAGE DE DRAIN:
   - Tarif standard: 450$ → "quatre cent cinquante dollars"
   - Rive-Sud: 500$ → "cinq cents dollars"
   - Inclus: 2 techniciens, 1 heure, jet haute pression
   - Temps supplémentaire: 42.50$/15 minutes

3. DÉBOUCHAGE D'URGENCE:
   - Même tarification que nettoyage
   - Service 24/7 disponible

SERVICES OFFERTS:
- Inspection par caméra HD
- Débouchage d'égout et drain
- Nettoyage de drain français
- Remplacement de drain
- Excavation
- Réhabilitation sans tranchée (technologie écologique)
- Service d'urgence 24/7

RÈGLES DE PRONONCIATION IMPORTANTES:
1. TOUS les prix doivent être prononcés en lettres françaises
2. TOUS les numéros de téléphone doivent être dits chiffre par chiffre
3. Les codes postaux doivent être épelés lettre par lettre et chiffre par chiffre
4. Parler lentement et clairement, avec des pauses naturelles
5. Utiliser "dollars" et non "$" dans la prononciation

APPROCHE CLIENT:
- Toujours commencer par: "Bonjour, Drain Fortin, comment puis-je vous aider?"
- Être poli et professionnel
- Mentionner nos certifications si pertinent (RBQ, APCHQ, CMMTQ, CCQ)
- Proposer une inspection par caméra avant tout travail majeur
- Mentionner notre service 24/7 pour les urgences
- Ne JAMAIS raccrocher en premier

PRISE DE RENDEZ-VOUS:
- Demander: nom complet, téléphone, adresse complète avec code postal
- Confirmer la zone de service et mentionner supplément Rive-Sud si applicable
- Proposer plusieurs créneaux horaires
- Envoyer confirmation par courriel si désiré
- Rappeler le numéro pour joindre: Montréal ou Rive-Nord selon la zone`;

    // 3. Mettre à jour la configuration
    console.log('🔄 Application des informations réelles de Drain Fortin...\n');
    
    const updateData = {
      model: {
        ...currentConfig.model,
        systemPrompt: realSystemPrompt
      },
      voice: {
        ...currentConfig.voice,
        language: "fr",
        speed: 0.9,
        enableSsmlParsing: true
      },
      endCallFunctionEnabled: false,
      silenceTimeoutSeconds: 45,
      maxDurationSeconds: 1800,
      serverUrl: 'https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook'
    };
    
    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Erreur de mise à jour: ${error}`);
    }
    
    const updatedConfig = await updateResponse.json();
    
    console.log('✅ MISE À JOUR RÉUSSIE!\n');
    console.log('📋 Configuration mise à jour avec:');
    console.log('  • Vrais numéros: (514) 968-3239 & (450) 543-3939');
    console.log('  • Tarification réelle: 350$-500$ selon service et zone');
    console.log('  • Certifications: RBQ 5794-7517-01, APCHQ, CMMTQ, CCQ');
    console.log('  • Zones de service: Montréal, Laval, Lanaudière, Laurentides, Rive-Sud');
    console.log('  • Adresses des bureaux configurées');
    console.log('  • Service 24/7 confirmé\n');
    
    // 4. Vérification finale
    console.log('🔍 Vérification des contraintes critiques:\n');
    
    const verifyResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });
    
    const finalConfig = await verifyResponse.json();
    
    // Vérifier les points critiques
    const checks = [
      {
        name: 'Vrais numéros dans le prompt',
        passed: finalConfig.model?.systemPrompt?.includes('514) 968-3239')
      },
      {
        name: 'Prix en lettres configurés',
        passed: finalConfig.model?.systemPrompt?.includes('trois cent cinquante dollars')
      },
      {
        name: 'Numéros chiffre par chiffre',
        passed: finalConfig.model?.systemPrompt?.includes('cinq, un, quatre')
      },
      {
        name: 'Certifications mentionnées',
        passed: finalConfig.model?.systemPrompt?.includes('RBQ: 5794-7517-01')
      },
      {
        name: 'Ne raccroche jamais',
        passed: finalConfig.endCallFunctionEnabled === false
      },
      {
        name: 'SSML activé',
        passed: finalConfig.voice?.enableSsmlParsing === true
      },
      {
        name: 'Langue française',
        passed: finalConfig.voice?.language === 'fr'
      },
      {
        name: 'Webhook production',
        passed: finalConfig.serverUrl?.includes('supabase.co')
      }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      if (check.passed) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name}`);
        allPassed = false;
      }
    });
    
    console.log('\n════════════════════════════════════════════════════════\n');
    
    if (allPassed) {
      console.log('🎉 SYSTÈME 100% PRÊT POUR LA PRODUCTION!\n');
      console.log('✅ Toutes les informations réelles sont configurées');
      console.log('✅ Les contraintes de Guillaume sont respectées');
      console.log('✅ Le système est prêt à recevoir des appels\n');
      
      console.log('📞 NUMÉROS CONFIGURÉS:');
      console.log('  • Montréal: (514) 968-3239');
      console.log('  • Rive-Nord: (450) 543-3939\n');
      
      console.log('⚠️ DERNIÈRE ÉTAPE:');
      console.log('Mettre à jour le fichier .env avec les vrais numéros Twilio de Guillaume\n');
    } else {
      console.log('⚠️ ATTENTION: Certaines vérifications ont échoué');
      console.log('Veuillez vérifier manuellement dans le dashboard VAPI\n');
    }
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.log('\nVeuillez vérifier:');
    console.log('1. La clé API VAPI est valide');
    console.log('2. L\'assistant existe');
    console.log('3. La connexion internet est stable\n');
  }
}

// Exécuter la mise à jour
console.log('📌 Source des données: drainfortin.ca (site officiel)');
console.log('📌 Date de validation: 11 septembre 2025\n');

updateToRealData();