/**
 * Configuration Optimisée pour la Prononciation Française
 * Corrige les problèmes de nombres, prix, taxes, emails, téléphones
 */

// Fonction pour convertir les nombres en lettres françaises
function nombreEnLettres(num) {
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const centaines = ['', 'cent', 'deux cents', 'trois cents', 'quatre cents', 'cinq cents', 'six cents', 'sept cents', 'huit cents', 'neuf cents'];
  
  if (num === 0) return 'zéro';
  if (num < 10) return unites[num];
  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    if (d === 1 && u > 0) {
      const special = ['onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
      return special[u - 1];
    }
    return dizaines[d] + (u > 0 ? '-' + unites[u] : '');
  }
  if (num < 1000) {
    const c = Math.floor(num / 100);
    const reste = num % 100;
    return centaines[c] + (reste > 0 ? ' ' + nombreEnLettres(reste) : '');
  }
  if (num < 1000000) {
    const m = Math.floor(num / 1000);
    const reste = num % 1000;
    return (m > 1 ? nombreEnLettres(m) + ' ' : '') + 'mille' + (reste > 0 ? ' ' + nombreEnLettres(reste) : '');
  }
  return num.toString();
}

// Formatage des prix pour meilleure prononciation
function formatPrixPourVoix(montant) {
  const entier = Math.floor(montant);
  const decimales = Math.round((montant - entier) * 100);
  
  let texte = nombreEnLettres(entier) + ' dollars';
  
  if (decimales > 0) {
    texte += ' et ' + nombreEnLettres(decimales) + ' cents';
  }
  
  return texte;
}

// Formatage des numéros de téléphone
function formatTelephonePourVoix(numero) {
  // Nettoyer le numéro
  const clean = numero.replace(/\D/g, '');
  
  if (clean.length === 10) {
    // Format: 450 280 3222
    const parties = [
      clean.substring(0, 3),
      clean.substring(3, 6),
      clean.substring(6, 10)
    ];
    
    return parties.map(partie => {
      return partie.split('').map(chiffre => nombreEnLettres(parseInt(chiffre))).join(' ');
    }).join(', ');
  }
  
  return numero;
}

// Formatage des emails pour épellation
function formatEmailPourVoix(email) {
  return email
    .toLowerCase()
    .replace('@', ' arobase ')
    .replace('.', ' point ')
    .replace('-', ' tiret ')
    .replace('_', ' tiret bas ')
    .split('')
    .map(char => {
      if (/[a-z]/.test(char)) return char;
      if (/[0-9]/.test(char)) return nombreEnLettres(parseInt(char));
      return ' ';
    })
    .join(' ');
}

// Configuration SSML pour VAPI
const ssmlConfig = {
  // Pauses stratégiques
  pauseCourte: '<break time="200ms"/>',
  pauseMoyenne: '<break time="500ms"/>',
  pauseLongue: '<break time="1s"/>',
  
  // Emphase pour les montants
  emphasePrice: (text) => `<emphasis level="strong">${text}</emphasis>`,
  
  // Vitesse de parole pour les nombres
  slowSpeed: (text) => `<prosody rate="slow">${text}</prosody>`,
  
  // Épellation lettre par lettre
  spellOut: (text) => `<say-as interpret-as="spell-out">${text}</say-as>`,
  
  // Format téléphone
  telephone: (num) => `<say-as interpret-as="telephone">${num}</say-as>`
};

// Prompt système optimisé avec règles de prononciation
const systemPromptOptimise = `Tu es Paul, agent virtuel de Drain Fortin disponible 24/7.

RÈGLES DE PRONONCIATION CRITIQUES:

1. NOMBRES ET PRIX:
   - Toujours dire les nombres en toutes lettres
   - Prix: dire "trois cent cinquante dollars" PAS "350$"
   - Taxes: dire "plus taxes" avec une pause avant
   - Exemple: "Le prix est de trois cent cinquante dollars, plus taxes"

2. NUMÉROS DE TÉLÉPHONE:
   - Épeler chiffre par chiffre avec pauses
   - Format: "quatre, cinq, zéro... deux, huit, zéro... trois, deux, deux, deux"
   - Jamais dire "quatre cent cinquante"

3. ADRESSES EMAIL:
   - Épeler lettre par lettre
   - @ = "arobase"
   - . = "point"
   - - = "tiret"
   - Exemple: "s u p p o r t arobase a u t o s c a l e a i point c a"

4. ADRESSES CIVIQUES:
   - Numéro en lettres: "mille deux cent trente-quatre rue Saint-Laurent"
   - Code postal avec pauses: "H deux V... un X neuf"

5. POURCENTAGES:
   - TPS: "cinq pour cent"
   - TVQ: "neuf point neuf sept cinq pour cent"
   - Jamais "5%" ou "9.975%"

6. DATES ET HEURES:
   - Dates: "le quinze janvier deux mille vingt-cinq"
   - Heures: "quatorze heures trente" PAS "14h30"

7. PAUSES STRATÉGIQUES:
   - Après chaque groupe de 3 chiffres
   - Avant "plus taxes"
   - Entre prénom et nom
   - Après "Bonjour" ou "Merci"

EXEMPLES DE RÉPONSES CORRECTES:
- "Le prix minimum est de trois cent cinquante dollars... plus taxes"
- "Notre numéro est le quatre, cinq, zéro... deux, huit, zéro... trois, deux, deux, deux"
- "Envoyez un courriel à s u p p o r t arobase a u t o s c a l e a i point c a"
- "La TPS est de cinq pour cent et la TVQ de neuf point neuf sept cinq pour cent"

[Reste de tes contraintes Guillaume...]`;

// Fonctions à intégrer dans VAPI
const vapiFunctions = [
  {
    name: "formatPriceForSpeech",
    description: "Formate un prix en dollars pour une prononciation claire",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Montant en dollars" }
      },
      required: ["amount"]
    },
    implementation: formatPrixPourVoix
  },
  {
    name: "formatPhoneForSpeech",
    description: "Formate un numéro de téléphone pour épellation claire",
    parameters: {
      type: "object",
      properties: {
        phoneNumber: { type: "string", description: "Numéro de téléphone" }
      },
      required: ["phoneNumber"]
    },
    implementation: formatTelephonePourVoix
  },
  {
    name: "formatEmailForSpeech",
    description: "Formate une adresse email pour épellation claire",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "Adresse email" }
      },
      required: ["email"]
    },
    implementation: formatEmailPourVoix
  }
];

// Configuration vocale optimisée pour ElevenLabs
const voiceSettings = {
  provider: "11labs",
  voiceId: "pNInz6obpgDQGcFmaJgB", // Adam
  model: "eleven_multilingual_v2", // Meilleur support français
  stability: 0.65, // Plus stable pour les nombres
  similarityBoost: 0.75,
  useSpeakerBoost: true,
  optimizeStreamingLatency: 3, // Moins de latence mais meilleure qualité
  enableSsmlParsing: true, // IMPORTANT: Activer SSML
  language: "fr-CA", // Français canadien explicite
  pronunciation: {
    numbers: "spell-out", // Épeler les nombres
    currency: "full", // Dire le nom complet de la devise
    telephone: "digits", // Chiffre par chiffre
    email: "spell" // Épeler les emails
  }
};

// Export de la configuration
module.exports = {
  nombreEnLettres,
  formatPrixPourVoix,
  formatTelephonePourVoix,
  formatEmailPourVoix,
  ssmlConfig,
  systemPromptOptimise,
  vapiFunctions,
  voiceSettings
};

// Exemples d'utilisation
console.log("=== TESTS DE PRONONCIATION ===");
console.log("350$ →", formatPrixPourVoix(350));
console.log("403.48$ →", formatPrixPourVoix(403.48));
console.log("450-280-3222 →", formatTelephonePourVoix("450-280-3222"));
console.log("support@autoscaleai.ca →", formatEmailPourVoix("support@autoscaleai.ca"));