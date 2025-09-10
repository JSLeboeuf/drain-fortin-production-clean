const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Configuration Supabase
const supabaseUrl = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg';

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'web-app';
const APP_PATH = 'drain-fortin';

async function uploadFile(filePath, targetPath) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(targetPath, fileContent, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error(`❌ Erreur upload ${targetPath}:`, error.message);
      return false;
    }
    
    console.log(`✅ Uploadé: ${targetPath}`);
    return true;
  } catch (err) {
    console.error(`❌ Erreur fichier ${filePath}:`, err.message);
    return false;
  }
}

async function uploadDirectory(localDir, remoteDir) {
  const files = fs.readdirSync(localDir);
  let success = true;

  for (const file of files) {
    const localPath = path.join(localDir, file);
    const remotePath = `${remoteDir}/${file}`;
    
    const stats = fs.statSync(localPath);
    
    if (stats.isDirectory()) {
      success = await uploadDirectory(localPath, remotePath) && success;
    } else {
      success = await uploadFile(localPath, remotePath) && success;
    }
  }
  
  return success;
}

async function deploy() {
  console.log('🚀 Déploiement sur Supabase Storage...\n');
  
  const distPath = path.join(__dirname, 'frontend', 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Le dossier dist n\'existe pas. Exécutez "npm run build" d\'abord.');
    process.exit(1);
  }

  console.log('📦 Upload des fichiers...\n');
  
  const success = await uploadDirectory(distPath, APP_PATH);
  
  if (success) {
    console.log('\n✨ Déploiement réussi!');
    console.log(`\n🌐 URL de l'application:`);
    console.log(`   ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${APP_PATH}/index.html`);
  } else {
    console.log('\n⚠️ Certains fichiers n\'ont pas pu être uploadés.');
  }
}

// Exécuter le déploiement
deploy().catch(console.error);