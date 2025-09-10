#!/usr/bin/env node

/**
 * Automated script to replace console statements with secure logger
 * Part of the UltraThink systemic improvement strategy
 */

const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/components/dashboard/OnboardingChecklist.tsx',
  'src/pages/Dashboard.tsx',
  'src/lib/sanitize.ts',
  'src/components/settings/EnhancedConstraintsDashboard.tsx',
  'src/components/settings/EnhancedConstraintsDashboardV2.tsx',
  'src/components/settings/hooks/useConstraintFilters.ts',
  'src/lib/secure-websocket.ts',
  'src/components/shared/ErrorBoundary.tsx',
  'src/main.tsx',
  'src/hooks/useFeatureFlag.ts',
  'src/components/ErrorBoundary.tsx',
  'src/pages/RealTimeMonitoring.tsx',
  'src/pages/Calls.tsx',
  'src/pages/settings/GuillaumeSettings.tsx',
  'src/hooks/useNotifications.ts'
];

const skipFiles = [
  'src/lib/secureStorage.ts', // Already uses console.warn appropriately
  'src/test/integration/dashboard-workflow.test.tsx', // Test file
  'src/mocks/no-outbound.ts' // Mock file
];

function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  let hasLoggerImport = content.includes('import { logger }') || content.includes('from "@/lib/logger"');

  // Replace console.log
  if (content.includes('console.log')) {
    content = content.replace(/console\.log\(/g, 'logger.info(');
    modified = true;
  }

  // Replace console.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
  }

  // Replace console.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
  }

  // Replace console.debug
  if (content.includes('console.debug')) {
    content = content.replace(/console\.debug\(/g, 'logger.debug(');
    modified = true;
  }

  // Add logger import if needed and file was modified
  if (modified && !hasLoggerImport) {
    // Find the right place to add import
    const importMatch = content.match(/^import .* from ['"].*/m);
    if (importMatch) {
      const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, lastImportIndex) + 
                '\nimport { logger } from "@/lib/logger";' + 
                content.slice(lastImportIndex);
    } else {
      // No imports found, add at the beginning
      content = 'import { logger } from "@/lib/logger";\n\n' + content;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Processed ${filePath} - replaced console statements with logger`);
    return true;
  } else {
    console.log(`⏭️  Skipped ${filePath} - no console statements found`);
    return false;
  }
}

// Main execution
console.log('🚀 Starting automated console.log removal...\n');

let processedCount = 0;
let skippedCount = 0;

filesToProcess.forEach(file => {
  if (processFile(file)) {
    processedCount++;
  } else {
    skippedCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Processed: ${processedCount} files`);
console.log(`⏭️  Skipped: ${skippedCount} files`);
console.log(`🚫 Excluded: ${skipFiles.length} files (test/mock/already handled)`);
console.log('\n✨ Console statement removal complete!');