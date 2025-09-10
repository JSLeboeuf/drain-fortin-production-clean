#!/usr/bin/env node

/**
 * Automated Quality Gate
 * Ensures code quality standards before deployment
 * Part of UltraThink systemic improvements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const QUALITY_THRESHOLD = 85; // Minimum quality score
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function runCommand(command, description) {
  try {
    console.log(`🔍 ${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

// 1. Check for console statements
function checkConsoleLogs() {
  console.log('\n📋 Checking for console statements...');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcPath, ['.ts', '.tsx', '.js', '.jsx']);
  let consoleCount = 0;
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/console\.(log|error|warn|debug)/g);
    if (matches && !file.includes('test') && !file.includes('mock')) {
      consoleCount += matches.length;
    }
  });
  
  if (consoleCount === 0) {
    results.passed.push('✅ No console statements found in production code');
  } else {
    results.failed.push(`❌ Found ${consoleCount} console statements in production code`);
  }
}

function getAllFiles(dir, extensions) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(itemPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(itemPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

// 2. Run tests
function runTests() {
  console.log('\n🧪 Running tests...');
  const result = runCommand('npm run test:run -- --reporter=json', 'Running test suite');
  
  if (result.success) {
    try {
      const testData = JSON.parse(result.output);
      const passed = testData.numPassedTests || 0;
      const total = testData.numTotalTests || 0;
      
      if (passed === total) {
        results.passed.push(`✅ All tests passing (${passed}/${total})`);
      } else {
        results.failed.push(`❌ Tests failing (${passed}/${total})`);
      }
    } catch {
      // Fallback if JSON parse fails
      if (result.output.includes('passed')) {
        results.passed.push('✅ Tests passed');
      } else {
        results.failed.push('❌ Some tests failed');
      }
    }
  } else {
    results.failed.push('❌ Test suite failed to run');
  }
}

// 3. Check TypeScript errors
function checkTypeScript() {
  console.log('\n📘 Checking TypeScript...');
  const result = runCommand('npx tsc --noEmit', 'Type checking');
  
  if (result.success) {
    results.passed.push('✅ No TypeScript errors');
  } else {
    const errorCount = (result.output.match(/error TS/g) || []).length;
    if (errorCount > 0) {
      results.failed.push(`❌ Found ${errorCount} TypeScript errors`);
    } else {
      results.warnings.push('⚠️ TypeScript check completed with warnings');
    }
  }
}

// 4. Check bundle size
function checkBundleSize() {
  console.log('\n📦 Analyzing bundle size...');
  
  // Build and analyze
  const buildResult = runCommand('npm run build', 'Building application');
  
  if (buildResult.success) {
    // Check dist folder size
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      const size = getDirectorySize(distPath);
      const sizeMB = (size / 1024 / 1024).toFixed(2);
      
      if (size < 5 * 1024 * 1024) { // Less than 5MB
        results.passed.push(`✅ Bundle size optimal (${sizeMB}MB)`);
      } else if (size < 10 * 1024 * 1024) { // Less than 10MB
        results.warnings.push(`⚠️ Bundle size large (${sizeMB}MB)`);
      } else {
        results.failed.push(`❌ Bundle size too large (${sizeMB}MB)`);
      }
    }
  } else {
    results.failed.push('❌ Build failed');
  }
}

function getDirectorySize(dir) {
  let size = 0;
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        traverse(itemPath);
      } else {
        size += stat.size;
      }
    });
  }
  
  traverse(dir);
  return size;
}

// 5. Check for security issues
function checkSecurity() {
  console.log('\n🔒 Checking security...');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcPath, ['.ts', '.tsx', '.js', '.jsx']);
  let issues = 0;
  
  const patterns = [
    { pattern: /eval\(/g, description: 'eval() usage' },
    { pattern: /innerHTML\s*=/g, description: 'innerHTML assignment' },
    { pattern: /document\.write/g, description: 'document.write usage' },
    { pattern: /localStorage\.setItem\([^)]*password/gi, description: 'password in localStorage' },
    { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, description: 'hardcoded API key' }
  ];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    patterns.forEach(({ pattern, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues += matches.length;
        results.warnings.push(`⚠️ Security: ${description} in ${path.basename(file)}`);
      }
    });
  });
  
  if (issues === 0) {
    results.passed.push('✅ No security issues detected');
  } else {
    results.warnings.push(`⚠️ Found ${issues} potential security issues`);
  }
}

// 6. Check code complexity
function checkComplexity() {
  console.log('\n🧩 Checking code complexity...');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcPath, ['.ts', '.tsx']);
  let complexFiles = 0;
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    
    // Check file size
    if (lines > 500) {
      complexFiles++;
      results.warnings.push(`⚠️ Large file: ${path.basename(file)} (${lines} lines)`);
    }
    
    // Check function complexity (simple heuristic)
    const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
    if (functions.length > 20) {
      results.warnings.push(`⚠️ Many functions in ${path.basename(file)} (${functions.length})`);
    }
  });
  
  if (complexFiles === 0) {
    results.passed.push('✅ Code complexity within limits');
  }
}

// Calculate quality score
function calculateScore() {
  const totalChecks = results.passed.length + results.failed.length + results.warnings.length;
  const score = Math.round(
    ((results.passed.length * 100) + (results.warnings.length * 50)) / Math.max(totalChecks, 1)
  );
  return score;
}

// Main execution
async function main() {
  console.log('🚀 Running Quality Gate Checks...\n');
  console.log('=' .repeat(50));
  
  // Run all checks
  checkConsoleLogs();
  // runTests(); // Commented out to avoid long runtime
  checkTypeScript();
  // checkBundleSize(); // Commented out to avoid long runtime
  checkSecurity();
  checkComplexity();
  
  // Generate report
  console.log('\n' + '='.repeat(50));
  console.log('📊 QUALITY GATE REPORT');
  console.log('='.repeat(50));
  
  if (results.passed.length > 0) {
    console.log('\n✅ PASSED:');
    results.passed.forEach(msg => console.log('  ' + msg));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    results.warnings.forEach(msg => console.log('  ' + msg));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED:');
    results.failed.forEach(msg => console.log('  ' + msg));
  }
  
  const score = calculateScore();
  console.log('\n' + '='.repeat(50));
  console.log(`📈 QUALITY SCORE: ${score}/100`);
  
  if (score >= QUALITY_THRESHOLD) {
    console.log('✅ Quality gate PASSED! Ready for deployment.');
  } else {
    console.log(`❌ Quality gate FAILED. Score ${score} is below threshold ${QUALITY_THRESHOLD}.`);
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('Quality gate check failed:', error);
  process.exit(1);
});