const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_FROM = '+14389004385'; // Drain Fortin - Test Direct

// Numéro de test (votre numéro pour recevoir le SMS)
const INTERNAL_TEAM_NUMBER = '+14502803222';

// Test direct avec Twilio - P1 Urgence
async function testP1Urgency() {
  console.log('🚨 Test SMS Urgence P1 - Équipe Interne...\n');
  
  const message = `🚨 URGENCE IMMÉDIATE - Drain Fortin

CLIENT: Jean Tremblay
TÉL: 514-555-1234
ADRESSE: 123 rue Principale, Brossard
PROBLÈME: Refoulement d'égout dans le sous-sol
PRIORITÉ: P1

Rappeler le client rapidement.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const body = new URLSearchParams();
    body.set('From', TWILIO_FROM);
    body.set('To', INTERNAL_TEAM_NUMBER);
    body.set('Body', message);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    const result = await response.json();
    
    if (response.ok && result.sid) {
      console.log('✅ SMS P1 envoyé avec succès!');
      console.log('   SID:', result.sid);
      console.log('   To:', result.to);
      console.log('   Status:', result.status);
    } else {
      console.error('❌ Erreur:', result);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Test P2 - Priorité Municipale
async function testP2Municipal() {
  console.log('\n⚠️ Test SMS P2 - Municipal...\n');
  
  const message = `⚠️ PRIORITÉ MUNICIPALE - Drain Fortin

CLIENT: Ville de Longueuil
TÉL: 450-555-6789
ADRESSE: 456 boul. Saint-Laurent, Longueuil
PROBLÈME: Égout municipal bloqué
PRIORITÉ: P2

Rappeler le client rapidement.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const body = new URLSearchParams();
    body.set('From', TWILIO_FROM);
    body.set('To', INTERNAL_TEAM_NUMBER);
    body.set('Body', message);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    const result = await response.json();
    
    if (response.ok && result.sid) {
      console.log('✅ SMS P2 envoyé avec succès!');
      console.log('   SID:', result.sid);
      console.log('   Status:', result.status);
    } else {
      console.error('❌ Erreur:', result);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Test P3 - Service Majeur
async function testP3ServiceMajeur() {
  console.log('\n🔧 Test SMS P3 - Service Majeur...\n');
  
  const message = `🔧 SERVICE MAJEUR - Drain Fortin

CLIENT: Marie Dubois
TÉL: 438-555-9876
ADRESSE: 789 avenue des Érables, Saint-Hubert
PROBLÈME: Installation de gainage complet
PRIORITÉ: P3

Rappeler le client rapidement.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const body = new URLSearchParams();
    body.set('From', TWILIO_FROM);
    body.set('To', INTERNAL_TEAM_NUMBER);
    body.set('Body', message);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    const result = await response.json();
    
    if (response.ok && result.sid) {
      console.log('✅ SMS P3 envoyé avec succès!');
      console.log('   SID:', result.sid);
      console.log('   Status:', result.status);
    } else {
      console.error('❌ Erreur:', result);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Test P4 - Service Standard
async function testP4Standard() {
  console.log('\n📋 Test SMS P4 - Service Standard...\n');
  
  const message = `📋 SERVICE STANDARD - Drain Fortin

CLIENT: Robert Gagnon
TÉL: 514-555-3456
ADRESSE: 321 rue des Pins, Montréal
PROBLÈME: Inspection caméra préventive
PRIORITÉ: P4

Rappeler le client rapidement.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const body = new URLSearchParams();
    body.set('From', TWILIO_FROM);
    body.set('To', INTERNAL_TEAM_NUMBER);
    body.set('Body', message);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    const result = await response.json();
    
    if (response.ok && result.sid) {
      console.log('✅ SMS P4 envoyé avec succès!');
      console.log('   SID:', result.sid);
      console.log('   Status:', result.status);
    } else {
      console.error('❌ Erreur:', result);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Menu de sélection
async function main() {
  console.log('========================================');
  console.log('  TEST SMS ÉQUIPE INTERNE DRAIN FORTIN');
  console.log('========================================');
  console.log(`📱 Envoi vers: ${INTERNAL_TEAM_NUMBER}`);
  console.log('');
  console.log('Choisir le niveau d\'urgence à tester:');
  console.log('1. P1 - URGENCE IMMÉDIATE (Inondation)');
  console.log('2. P2 - PRIORITÉ MUNICIPALE');
  console.log('3. P3 - SERVICE MAJEUR (Gainage)');
  console.log('4. P4 - SERVICE STANDARD');
  console.log('5. Tous les niveaux (4 SMS)');
  console.log('');
  
  // Par défaut, on teste P1
  const choice = process.argv[2] || '1';
  
  switch(choice) {
    case '1':
      await testP1Urgency();
      break;
    case '2':
      await testP2Municipal();
      break;
    case '3':
      await testP3ServiceMajeur();
      break;
    case '4':
      await testP4Standard();
      break;
    case '5':
      await testP1Urgency();
      await new Promise(r => setTimeout(r, 2000));
      await testP2Municipal();
      await new Promise(r => setTimeout(r, 2000));
      await testP3ServiceMajeur();
      await new Promise(r => setTimeout(r, 2000));
      await testP4Standard();
      break;
    default:
      console.log('Choix invalide. Utilisation: node test-sms-internal.js [1-5]');
  }
  
  console.log('\n========================================');
  console.log('Test terminé!');
  console.log('');
  console.log('📌 Note: Les SMS sont maintenant envoyés à l\'équipe');
  console.log('interne avec les infos du client pour rappel.');
}

// Check if node-fetch is installed
try {
  require.resolve('node-fetch');
  main();
} catch(e) {
  console.log('Installation de node-fetch...');
  require('child_process').execSync('npm install node-fetch', {stdio: 'inherit'});
  console.log('Relancez le script: node test-sms-internal.js');
}