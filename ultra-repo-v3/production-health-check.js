#!/usr/bin/env node

/**
 * Production Health Check & Performance Validation
 * Tests all deployment targets and generates comprehensive report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

class HealthChecker {
  constructor() {
    this.endpoints = {
      vercel: 'https://drain-fortin-dashboard-iytasj86c-jsleboeuf3gmailcoms-projects.vercel.app',
      local: 'http://localhost:8080',
      supabase: null // Will be set from deployment file
    };
    this.results = {
      timestamp: new Date().toISOString(),
      deployments: {},
      performance: {},
      security: {},
      pwa: {},
      overall: 'pending'
    };
  }

  async loadDeploymentInfo() {
    try {
      const supabaseDeployment = await fs.readFile('supabase-deployment.json', 'utf-8');
      const supabaseInfo = JSON.parse(supabaseDeployment);
      this.endpoints.supabase = supabaseInfo.publicUrl;
    } catch (error) {
      console.log('⚠️  Supabase deployment info not found');
    }
  }

  async testEndpoint(name, url) {
    console.log(`🔍 Testing ${name}: ${url}`);
    
    try {
      const startTime = Date.now();
      const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code},%{time_total}" "${url}"`);
      const [statusCode, responseTime] = stdout.trim().split(',');
      const endTime = Date.now();
      
      const result = {
        url,
        statusCode: parseInt(statusCode),
        responseTime: parseFloat(responseTime) * 1000, // Convert to ms
        duration: endTime - startTime,
        status: parseInt(statusCode) === 200 ? 'healthy' : 'unhealthy'
      };
      
      this.results.deployments[name] = result;
      
      if (result.status === 'healthy') {
        console.log(`✅ ${name}: ${statusCode} (${Math.round(result.responseTime)}ms)`);
      } else {
        console.log(`❌ ${name}: ${statusCode} (${Math.round(result.responseTime)}ms)`);
      }
      
      return result;
    } catch (error) {
      const result = {
        url,
        error: error.message,
        status: 'error'
      };
      
      this.results.deployments[name] = result;
      console.log(`💥 ${name}: ${error.message}`);
      return result;
    }
  }

  async testPWAFeatures() {
    console.log('📱 Testing PWA features...');
    
    const pwaTests = [
      { name: 'manifest', path: '/manifest.webmanifest' },
      { name: 'serviceWorker', path: '/sw.js' },
      { name: 'icons', path: '/pwa-192.png' }
    ];
    
    for (const test of pwaTests) {
      try {
        const url = `${this.endpoints.vercel}${test.path}`;
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" "${url}"`);
        const statusCode = parseInt(stdout.trim());
        
        this.results.pwa[test.name] = {
          status: statusCode === 200 ? 'available' : 'missing',
          statusCode
        };
        
        console.log(`${statusCode === 200 ? '✅' : '❌'} PWA ${test.name}: ${statusCode}`);
      } catch (error) {
        this.results.pwa[test.name] = { status: 'error', error: error.message };
        console.log(`💥 PWA ${test.name}: ${error.message}`);
      }
    }
  }

  async testPerformance() {
    console.log('⚡ Testing performance...');
    
    try {
      const vercelUrl = this.endpoints.vercel;
      const { stdout } = await execAsync(
        `curl -s -o /dev/null -w "time_namelookup:%{time_namelookup},time_connect:%{time_connect},time_starttransfer:%{time_starttransfer},time_total:%{time_total},size_download:%{size_download}" "${vercelUrl}"`
      );
      
      const metrics = {};
      stdout.trim().split(',').forEach(pair => {
        const [key, value] = pair.split(':');
        metrics[key] = parseFloat(value);
      });
      
      this.results.performance = {
        dns: metrics.time_namelookup * 1000,
        connect: metrics.time_connect * 1000,
        firstByte: metrics.time_starttransfer * 1000,
        total: metrics.time_total * 1000,
        downloadSize: metrics.size_download,
        status: metrics.time_total < 2.0 ? 'excellent' : metrics.time_total < 5.0 ? 'good' : 'needs-improvement'
      };
      
      console.log(`✅ Performance: ${Math.round(this.results.performance.total)}ms total`);
    } catch (error) {
      this.results.performance = { status: 'error', error: error.message };
      console.log(`💥 Performance test failed: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('📋 Generating comprehensive deployment report...');
    
    // Calculate overall status
    const deploymentStatuses = Object.values(this.results.deployments).map(d => d.status);
    const healthyDeployments = deploymentStatuses.filter(s => s === 'healthy').length;
    const totalDeployments = deploymentStatuses.length;
    
    if (healthyDeployments === totalDeployments) {
      this.results.overall = 'excellent';
    } else if (healthyDeployments > 0) {
      this.results.overall = 'partial';
    } else {
      this.results.overall = 'failed';
    }
    
    // Create comprehensive report
    const report = {
      ...this.results,
      summary: {
        deploymentSuccess: `${healthyDeployments}/${totalDeployments}`,
        primaryTarget: this.results.deployments.vercel?.status || 'unknown',
        backupTarget: this.results.deployments.supabase?.status || 'not-tested',
        performanceGrade: this.results.performance.status || 'unknown',
        pwaCompliance: Object.values(this.results.pwa).filter(p => p.status === 'available').length,
        overallStatus: this.results.overall
      },
      recommendations: []
    };
    
    // Add recommendations
    if (this.results.deployments.vercel?.status !== 'healthy') {
      report.recommendations.push('⚠️  Verify Vercel deployment configuration and environment variables');
    }
    
    if (this.results.performance.total > 2000) {
      report.recommendations.push('⚡ Consider optimizing bundle size or implementing CDN');
    }
    
    if (Object.values(this.results.pwa).some(p => p.status !== 'available')) {
      report.recommendations.push('📱 Review PWA configuration for missing assets');
    }
    
    // Save report
    const reportPath = `production-health-report-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Health check report saved: ${reportPath}`);
    return report;
  }

  async run() {
    console.log('🏥 Starting Production Health Check...');
    console.log('====================================');
    
    await this.loadDeploymentInfo();
    
    // Test all endpoints
    for (const [name, url] of Object.entries(this.endpoints)) {
      if (url) {
        await this.testEndpoint(name, url);
      }
    }
    
    await this.testPWAFeatures();
    await this.testPerformance();
    
    const report = await this.generateReport();
    
    console.log('\n🏁 Health Check Complete!');
    console.log(`Overall Status: ${report.overall.toUpperCase()}`);
    console.log(`Primary Deployment: ${report.summary.primaryTarget}`);
    
    return report;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  
  checker.run()
    .then(report => {
      console.log('\n🎊 HEALTH CHECK COMPLETE! 🎊');
      process.exit(report.overall === 'failed' ? 1 : 0);
    })
    .catch(error => {
      console.error('\n💥 HEALTH CHECK FAILED! 💥');
      console.error(error.message);
      process.exit(1);
    });
}

export default HealthChecker;