#!/usr/bin/env node

/**
 * Script pour prévisualiser les fichiers HTML du projet
 * Usage: node preview-html.js <nom-du-fichier.html>
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;

// Vérifier si un fichier est spécifié
const fileName = process.argv[2];
if (!fileName) {
    console.log('❌ Veuillez spécifier un fichier HTML');
    console.log('Usage: node preview-html.js <nom-du-fichier.html>');
    console.log('\nFichiers HTML disponibles:');
    console.log('• courriel-100-pourcent-credible.html');
    console.log('• courriel-guillaume-final.html');
    console.log('• courriel-guillaume-final-production.html');
    console.log('• courriel-final-complet-guillaume.html');
    process.exit(1);
}

// Vérifier si le fichier existe
const filePath = path.join(__dirname, fileName);
if (!fs.existsSync(filePath)) {
    console.log(`❌ Fichier non trouvé: ${fileName}`);
    process.exit(1);
}

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === `/${fileName}`) {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Erreur lors de la lecture du fichier');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Fichier non trouvé');
    }
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}/${fileName}`;
    console.log(`🚀 Serveur de prévisualisation démarré`);
    console.log(`📄 Fichier: ${fileName}`);
    console.log(`🌐 URL: ${url}`);
    console.log(`\n💡 Appuyez sur Ctrl+C pour arrêter le serveur\n`);

    // Ouvrir automatiquement dans le navigateur
    exec(`start ${url}`, (error) => {
        if (error) {
            console.log(`⚠️  Impossible d'ouvrir automatiquement le navigateur`);
            console.log(`📋 Copiez cette URL dans votre navigateur: ${url}`);
        }
    });
});

// Gestion de l'arrêt propre du serveur
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur de prévisualisation...');
    server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
    });
});
