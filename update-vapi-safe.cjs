/**
 * Script SÉCURITAIRE pour mettre à jour l'assistant VAPI
 * MODE ADDITIF - N'efface RIEN, ajoute seulement les nouvelles instructions
 */

const https = require('https');

// Configuration VAPI
const VAPI_API_KEY = 'c3b49727-9f3a-4581-a185-ac61e13004a9';
const ASSISTANT_ID = '90395b6a-5b14-4515-a7b8-1149db5787bc'; // ID correct de Paul

// Instructions ADDITIONNELLES pour questions séquentielles (sera AJOUTÉ au prompt existant)
const additionalInstructions = `

NOUVELLE RÈGLE IMPORTANTE (AJOUTÉE):
=======================================
Tu dois ABSOLUMENT poser UNE SEULE question à la fois et attendre la réponse complète avant de poser la question suivante.

PROCESSUS SÉQUENTIEL OBLIGATOIRE:
1. Pose UNE question
2. ATTENDS la réponse complète
3. CONFIRME que tu as compris
4. Pose la PROCHAINE question

INTERDIT:
- Poser plusieurs questions dans la même phrase
- Demander "nom, adresse et téléphone" en même temps
- Rusher le client avec trop d'informations

OBLIGATOIRE:
- Une seule question par tour de parole
- Laisser le client finir de parler
- Confirmer avant de continuer
- Être patient et naturel

Exemple CORRECT:
"Quel est votre nom?" [ATTENDRE]
"Merci. Quelle est votre adresse?" [ATTENDRE]
"Parfait. Votre numéro de téléphone?" [ATTENDRE]

Exemple INCORRECT:
"J'ai besoin de votre nom, adresse et téléphone" ❌
`;

// Fonction pour récupérer la configuration actuelle
async function getCurrentConfig() {
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

// Fonction pour mettre à jour SEULEMENT le system prompt (mode additif)
async function updateSystemPromptOnly(currentConfig) {
  return new Promise((resolve, reject) => {
    // Récupérer le prompt actuel et AJOUTER les nouvelles instructions
    const currentPrompt = currentConfig.model?.systemPrompt || '';
    const updatedPrompt = currentPrompt + additionalInstructions;
    
    // Préparer SEULEMENT la mise à jour du prompt (garde tout le reste)
    const updatePayload = {
      model: {
        ...currentConfig.model, // Garde tous les paramètres existants
        systemPrompt: updatedPrompt // Ajoute seulement au prompt
      }
    };
    
    const payload = JSON.stringify(updatePayload);
    
    const options = {
      hostname: 'api.vapi.ai',
      path: `/assistant/${ASSISTANT_ID}`,
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
          reject(new Error(`Failed to update: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Script principal SÉCURITAIRE
async function main() {
  console.log('🔒 MISE À JOUR SÉCURITAIRE VAPI (Mode Additif)\n');
  console.log('============================================\n');
  console.log('⚠️  Mode ADDITIF: Aucune configuration existante ne sera effacée\n');

  try {
    // 1. Récupérer la configuration ACTUELLE
    console.log('📥 Récupération de la configuration actuelle...');
    const currentConfig = await getCurrentConfig();
    console.log(`✅ Configuration récupérée pour: ${currentConfig.name}\n`);
    
    // 2. Afficher ce qui sera AJOUTÉ
    console.log('📝 Instructions qui seront AJOUTÉES:');
    console.log('-----------------------------------');
    console.log('- Règle: Une seule question à la fois');
    console.log('- Processus séquentiel obligatoire');
    console.log('- Attendre les réponses complètes');
    console.log('- Confirmation avant question suivante\n');
    
    // 3. Sauvegarder la config actuelle (backup)
    const fs = require('fs');
    const backupFile = `vapi-backup-${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(currentConfig, null, 2));
    console.log(`💾 Backup créé: ${backupFile}\n`);
    
    // 4. Appliquer la mise à jour ADDITIVE
    console.log('🔄 Application des nouvelles instructions...');
    const updated = await updateSystemPromptOnly(currentConfig);
    
    console.log('✅ Mise à jour réussie!\n');
    console.log('📊 Résumé:');
    console.log('- Configuration existante: PRÉSERVÉE ✅');
    console.log('- Nouvelles instructions: AJOUTÉES ✅');
    console.log('- Questions séquentielles: ACTIVÉES ✅\n');
    
    console.log('🎉 Paul posera maintenant une question à la fois!');
    console.log('\n📞 Testez en appelant: (438) 900-4385');
    
    // 5. Sauvegarder le résultat
    fs.writeFileSync('vapi-updated-config.json', JSON.stringify(updated, null, 2));
    console.log(`\n📁 Configuration mise à jour sauvegardée: vapi-updated-config.json`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Aucune modification n\'a été appliquée.');
    console.log('Vérifiez la clé API et l\'ID de l\'assistant.');
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { getCurrentConfig, updateSystemPromptOnly };