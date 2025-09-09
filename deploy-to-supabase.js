/**
 * Script de déploiement du frontend sur Supabase Storage
 * Utilise le bucket public pour servir les fichiers statiques
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

// Configuration Supabase avec service key
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4NDk4MSwiZXhwIjoyMDYyNzYwOTgxfQ.ZRUd-6UwptM3w3tZCsm7SPl7-RzMfdEs_giTW9_2N5o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration du déploiement
const BUCKET_NAME = 'web-app';
const BUILD_DIR = path.join(__dirname, 'frontend', 'dist');
const DEPLOYMENT_PATH = 'drain-fortin';

async function setupBucket() {
  console.log('📦 Configuration du bucket Storage...\n');
  
  // Vérifier si le bucket existe
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Erreur listing buckets:', listError);
    return false;
  }
  
  const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`📁 Création du bucket "${BUCKET_NAME}"...`);
    
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: null // Tous les types
    });
    
    if (error) {
      console.error('❌ Erreur création bucket:', error);
      return false;
    }
    
    console.log('✅ Bucket créé avec succès!');
  } else {
    console.log(`✅ Bucket "${BUCKET_NAME}" existe déjà`);
  }
  
  return true;
}

async function uploadFile(filePath, targetPath) {
  const fileContent = await fs.readFile(filePath);
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  
  // Upload avec les bons headers
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(targetPath, fileContent, {
      contentType: mimeType,
      upsert: true,
      cacheControl: mimeType.startsWith('text/html') ? '0' : '3600'
    });
  
  if (error) {
    console.error(`❌ Erreur upload ${targetPath}:`, error.message);
    return false;
  }
  
  return true;
}

async function getFilesRecursive(dir, baseDir = dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      files.push(...await getFilesRecursive(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        fullPath,
        relativePath: relativePath.replace(/\\/g, '/')
      });
    }
  }
  
  return files;
}

async function deployFrontend() {
  console.log('🚀 DÉPLOIEMENT DU FRONTEND SUR SUPABASE\n');
  console.log('═══════════════════════════════════════════\n');
  
  // 1. Vérifier que le build existe
  try {
    await fs.access(BUILD_DIR);
  } catch {
    console.error('❌ Dossier dist/ non trouvé. Exécutez "npm run build" d\'abord.');
    process.exit(1);
  }
  
  // 2. Setup bucket
  const bucketReady = await setupBucket();
  if (!bucketReady) {
    console.error('❌ Impossible de configurer le bucket');
    process.exit(1);
  }
  
  // 3. Lister tous les fichiers à uploader
  console.log('\n📤 Upload des fichiers...\n');
  const files = await getFilesRecursive(BUILD_DIR);
  console.log(`📊 ${files.length} fichiers à déployer\n`);
  
  // 4. Nettoyer l'ancien déploiement
  console.log('🧹 Nettoyage de l\'ancien déploiement...');
  const { data: existingFiles } = await supabase.storage
    .from(BUCKET_NAME)
    .list(DEPLOYMENT_PATH, { limit: 1000 });
  
  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${DEPLOYMENT_PATH}/${f.name}`);
    await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
    console.log(`✅ ${filesToDelete.length} anciens fichiers supprimés\n`);
  }
  
  // 5. Upload tous les fichiers
  let uploaded = 0;
  let failed = 0;
  
  for (const file of files) {
    const targetPath = `${DEPLOYMENT_PATH}/${file.relativePath}`;
    process.stdout.write(`⬆️  ${file.relativePath}...`);
    
    const success = await uploadFile(file.fullPath, targetPath);
    
    if (success) {
      uploaded++;
      process.stdout.write(' ✅\n');
    } else {
      failed++;
      process.stdout.write(' ❌\n');
    }
  }
  
  // 6. Résumé
  console.log('\n═══════════════════════════════════════════');
  console.log('\n📊 RÉSUMÉ DU DÉPLOIEMENT:\n');
  console.log(`✅ Fichiers uploadés: ${uploaded}`);
  if (failed > 0) {
    console.log(`❌ Échecs: ${failed}`);
  }
  
  // 7. URLs d'accès
  const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${DEPLOYMENT_PATH}`;
  
  console.log('\n🌐 URLS D\'ACCÈS:\n');
  console.log(`📍 URL de base:`);
  console.log(`   ${baseUrl}/index.html`);
  console.log('\n📍 URL courte (si CDN configuré):');
  console.log(`   https://phiduqxcufdmgjvdipyu.supabase.co/storage/v1/render/image/public/${BUCKET_NAME}/${DEPLOYMENT_PATH}/index.html`);
  
  // 8. Configuration nginx recommandée
  console.log('\n⚙️  CONFIGURATION RECOMMANDÉE:\n');
  console.log('Pour un vrai domaine, configurez:');
  console.log('1. Un domaine personnalisé dans Supabase Dashboard');
  console.log('2. Ou utilisez un CDN comme Cloudflare/Vercel');
  console.log('3. Ou déployez sur Vercel/Netlify pour une meilleure performance');
  
  console.log('\n✅ Déploiement terminé avec succès!');
  console.log('═══════════════════════════════════════════\n');
  
  // Test d'accès
  console.log('🧪 Test d\'accès...');
  const testUrl = `${baseUrl}/index.html`;
  
  try {
    const response = await fetch(testUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log('✅ Site accessible!');
      console.log(`\n🎉 Votre site est en ligne à: ${testUrl}`);
    } else {
      console.log('⚠️  Site uploadé mais pas encore accessible (peut prendre quelques secondes)');
    }
  } catch (error) {
    console.log('⚠️  Impossible de vérifier l\'accès pour le moment');
  }
}

// Installation automatique de mime-types si nécessaire
async function checkDependencies() {
  try {
    require('mime-types');
  } catch {
    console.log('📦 Installation de mime-types...');
    const { exec } = require('child_process').promises;
    await exec('npm install mime-types');
    console.log('✅ Dépendances installées\n');
  }
}

// Exécution
async function main() {
  await checkDependencies();
  await deployFrontend();
}

main().catch(console.error);