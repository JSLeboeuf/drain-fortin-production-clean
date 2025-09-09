/**
 * Test Frontend avec Playwright
 * Capture d'écran et analyse de l'interface
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFrontendWithPlaywright() {
  console.log('🎭 Lancement de Playwright pour analyser le frontend...\n');
  
  const browser = await chromium.launch({
    headless: false, // Pour voir le navigateur
    slowMo: 500 // Ralentir pour voir les actions
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Capturer les erreurs console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Capturer les requêtes réseau
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url(), request.failure().errorText);
    });
    
    console.log('📱 Navigation vers http://localhost:5173...');
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Attendre que la page charge
    await page.waitForTimeout(3000);
    
    // Prendre une capture d'écran
    const screenshotPath = path.join(__dirname, 'screenshots', 'frontend-home.png');
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots');
    }
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`📸 Capture d'écran sauvegardée: ${screenshotPath}`);
    
    // Analyser le contenu de la page
    console.log('\n🔍 Analyse du contenu de la page...\n');
    
    // Titre de la page
    const title = await page.title();
    console.log(`📄 Titre: ${title}`);
    
    // Vérifier les éléments principaux
    const elements = {
      header: await page.$('header'),
      nav: await page.$('nav'),
      dashboard: await page.$('[data-testid="dashboard"]'),
      callsList: await page.$('[data-testid="calls-list"]'),
      alerts: await page.$('[data-testid="alerts"]'),
      stats: await page.$('[data-testid="stats"]')
    };
    
    console.log('\n📊 Éléments détectés:');
    for (const [name, element] of Object.entries(elements)) {
      console.log(`  ${element ? '✅' : '❌'} ${name}`);
    }
    
    // Chercher des textes spécifiques
    const textsToFind = [
      'Drain Fortin',
      'Paul',
      'Dashboard',
      'Appels',
      'Contraintes',
      'Paramètres'
    ];
    
    console.log('\n📝 Textes recherchés:');
    for (const text of textsToFind) {
      const found = await page.locator(`text="${text}"`).count() > 0;
      console.log(`  ${found ? '✅' : '❌'} "${text}"`);
    }
    
    // Vérifier les erreurs affichées
    const errorElements = await page.$$('.error, [class*="error"], [data-error]');
    if (errorElements.length > 0) {
      console.log(`\n⚠️ ${errorElements.length} éléments d'erreur détectés`);
      for (const error of errorElements) {
        const text = await error.textContent();
        console.log(`  - ${text}`);
      }
    }
    
    // Tester la navigation
    console.log('\n🧭 Test de navigation...');
    
    // Chercher les liens de navigation
    const navLinks = await page.$$('nav a, [role="navigation"] a, .nav-link');
    console.log(`  Trouvé ${navLinks.length} liens de navigation`);
    
    // Cliquer sur le premier lien si disponible
    if (navLinks.length > 0) {
      const firstLink = navLinks[0];
      const linkText = await firstLink.textContent();
      console.log(`  Clic sur: "${linkText}"`);
      await firstLink.click();
      await page.waitForTimeout(2000);
      
      // Nouvelle capture après navigation
      await page.screenshot({ 
        path: path.join(__dirname, 'screenshots', 'frontend-after-nav.png'),
        fullPage: true 
      });
    }
    
    // Vérifier la connexion Supabase
    console.log('\n🗄️ Vérification de la connexion Supabase...');
    
    // Exécuter du JavaScript dans la page pour vérifier Supabase
    const supabaseCheck = await page.evaluate(() => {
      // Vérifier si les variables d'environnement sont chargées
      const env = {
        supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || 'Non défini',
        hasAnonKey: !!import.meta.env?.VITE_SUPABASE_ANON_KEY
      };
      
      // Vérifier si Supabase est initialisé
      const hasSupabase = typeof window !== 'undefined' && 
                         (window.supabase || window.__SUPABASE_CLIENT__);
      
      return {
        env,
        hasSupabase,
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage)
      };
    });
    
    console.log('  Configuration Supabase:');
    console.log(`    URL: ${supabaseCheck.env.supabaseUrl}`);
    console.log(`    Clé Anon: ${supabaseCheck.env.hasAnonKey ? '✅' : '❌'}`);
    console.log(`    Client initialisé: ${supabaseCheck.hasSupabase ? '✅' : '❌'}`);
    
    // Obtenir les métriques de performance
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart),
        loadComplete: Math.round(perf.loadEventEnd - perf.loadEventStart),
        totalTime: Math.round(perf.loadEventEnd - perf.fetchStart)
      };
    });
    
    console.log('\n⚡ Performance:');
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  Load Complete: ${metrics.loadComplete}ms`);
    console.log(`  Total Time: ${metrics.totalTime}ms`);
    
    // Retourner les résultats
    return {
      success: true,
      title,
      elements: Object.keys(elements).filter(k => elements[k]),
      supabaseConnected: supabaseCheck.hasSupabase,
      screenshots: ['frontend-home.png', 'frontend-after-nav.png']
    };
    
  } catch (error) {
    console.error('❌ Erreur Playwright:', error.message);
    
    // Capture d'écran d'erreur
    try {
      await page.screenshot({ 
        path: path.join(__dirname, 'screenshots', 'error.png'),
        fullPage: true 
      });
    } catch (e) {}
    
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    await browser.close();
  }
}

// Explication de pourquoi Supabase CLI ne fonctionne pas
function explainSupabaseIssues() {
  console.log('\n📚 EXPLICATION DES PROBLÈMES SUPABASE CLI/SDK:\n');
  console.log('═══════════════════════════════════════════════\n');
  
  console.log('🔴 PROBLÈME 1: Permissions de création de tables');
  console.log('  - Les clés ANON n\'ont PAS les permissions pour CREATE TABLE');
  console.log('  - Seule la clé SERVICE_ROLE peut créer des tables');
  console.log('  - MAIS même avec SERVICE_ROLE, on ne peut pas via SDK JS\n');
  
  console.log('🔴 PROBLÈME 2: Limitations du SDK JavaScript');
  console.log('  - Le SDK Supabase JS est conçu pour les opérations CRUD');
  console.log('  - Il ne supporte PAS les commandes DDL (CREATE, ALTER, DROP)');
  console.log('  - Pas de méthode .createTable() ou .executeSql()\n');
  
  console.log('🔴 PROBLÈME 3: Fonction RPC exec_sql non existante');
  console.log('  - J\'ai essayé supabase.rpc("exec_sql") mais elle n\'existe pas');
  console.log('  - Cette fonction doit être créée manuellement d\'abord');
  console.log('  - Catch-22: on ne peut pas créer la fonction sans accès SQL\n');
  
  console.log('🟡 SOLUTIONS DISPONIBLES:\n');
  
  console.log('1️⃣ SOLUTION MANUELLE (Recommandée):');
  console.log('   - Dashboard Supabase > SQL Editor');
  console.log('   - Copier/Coller le SQL');
  console.log('   - Exécuter directement\n');
  
  console.log('2️⃣ SOLUTION CLI SUPABASE:');
  console.log('   - Installer: npm install -g supabase');
  console.log('   - Se connecter: supabase login');
  console.log('   - Lier le projet: supabase link --project-ref phiduqxcufdmgjvdipyu');
  console.log('   - Push migrations: supabase db push\n');
  
  console.log('3️⃣ SOLUTION API REST DIRECTE:');
  console.log('   - Utiliser l\'API REST de PostgreSQL (pg-rest)');
  console.log('   - Mais nécessite un endpoint spécial non exposé publiquement\n');
  
  console.log('4️⃣ SOLUTION MIGRATION:');
  console.log('   - J\'ai créé: supabase/migrations/20250909171713_create_missing_tables.sql');
  console.log('   - Peut être appliquée via Supabase CLI');
  console.log('   - Commande: npx supabase db push\n');
  
  console.log('⚠️ POURQUOI C\'EST SÉCURISÉ AINSI:');
  console.log('  - Empêche les injections SQL depuis le client');
  console.log('  - Force l\'utilisation du dashboard pour les changements de structure');
  console.log('  - Protège contre les modifications accidentelles de schéma');
  console.log('  - Suit les meilleures pratiques de sécurité\n');
}

// Fonction principale
async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   TEST FRONTEND AVEC PLAYWRIGHT           ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  
  // Playwright est déjà installé
  
  // Tester le frontend
  const results = await testFrontendWithPlaywright();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DU TEST FRONTEND:');
  console.log('═══════════════════════════════════════════\n');
  
  if (results.success) {
    console.log('✅ Frontend accessible et analysé');
    console.log(`📄 Titre: ${results.title}`);
    console.log(`🧩 Éléments trouvés: ${results.elements.join(', ')}`);
    console.log(`🗄️ Supabase connecté: ${results.supabaseConnected ? '✅' : '❌'}`);
    console.log(`📸 Captures sauvegardées: ${results.screenshots.join(', ')}`);
  } else {
    console.log('❌ Erreur lors du test:', results.error);
  }
  
  // Expliquer les problèmes Supabase
  explainSupabaseIssues();
  
  console.log('═══════════════════════════════════════════');
  console.log('✨ Test terminé!');
}

// Exécuter
main().catch(console.error);