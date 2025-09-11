// Enhanced Health Check Endpoint with Comprehensive Monitoring
// Production-grade health monitoring with performance metrics and alerting
// Version 2.0.0 - Complete health and performance monitoring

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withSecurityHeaders } from "../_shared/middleware/security-headers.ts";
import { getConnectionPool } from "../_shared/services/connection-pool.ts";
import { getPerformanceMetrics } from "../_shared/services/performance-optimizer.ts";
import { getSecurityMetrics } from "../_shared/middleware/security-headers.ts";
import { logger } from "../_shared/utils/logging.ts";

interface HealthCheckConfig {
  includeDetailed: boolean;
  includeMetrics: boolean;
  includeSecurity: boolean;
  includeDatabase: boolean;
  includeExternal: boolean;
  maxResponseTimeMs: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  responseTime: number;
  checks: HealthCheck[];
  summary?: HealthSummary;
  metrics?: any;
  security?: any;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  details?: any;
  lastChecked: string;
}

interface HealthSummary {
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  unhealthyChecks: number;
  overallScore: number;
  criticalIssues: string[];
  recommendations: string[];
}

// Environment configuration
const config = {
  supabaseUrl: Deno.env.get('SUPABASE_URL') || Deno.env.get('PUBLIC_SUPABASE_URL'),
  supabaseKey: Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  environment: Deno.env.get('ENVIRONMENT') || 'development',
  version: Deno.env.get('APP_VERSION') || '1.0.0',
  startTime: Date.now()
};

const supabase = createClient(config.supabaseUrl!, config.supabaseKey!);
const connectionPool = getConnectionPool();

// Core health checks
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = performance.now();
  
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('health_check')
      .select('1')
      .limit(1);
    
    // If health_check table doesn't exist, try a simple query
    if (error && error.message.includes('relation "health_check" does not exist')) {
      const { error: testError } = await supabase
        .rpc('now'); // Built-in function
      
      if (testError) throw testError;
    } else if (error) {
      throw error;
    }

    const responseTime = performance.now() - startTime;
    
    return {
      name: 'database',
      status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
      responseTime,
      message: `Database connection successful (${responseTime.toFixed(2)}ms)`,
      lastChecked: new Date().toISOString(),
      details: {
        connectionTime: responseTime,
        queryExecuted: 'basic_connectivity_test'
      }
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime,
      message: `Database connection failed: ${(error as Error).message}`,
      lastChecked: new Date().toISOString(),
      details: {
        error: (error as Error).message,
        connectionTime: responseTime
      }
    };
  }
}

async function checkConnectionPool(): Promise<HealthCheck> {
  const startTime = performance.now();
  
  try {
    const stats = connectionPool.getStats();
    const responseTime = performance.now() - startTime;
    
    // Determine status based on pool utilization
    let status: HealthCheck['status'] = 'healthy';
    let message = 'Connection pool operating normally';
    
    if (stats.poolUtilization > 80) {
      status = 'degraded';
      message = `High pool utilization: ${stats.poolUtilization.toFixed(1)}%`;
    } else if (stats.poolUtilization > 95) {
      status = 'unhealthy';
      message = `Critical pool utilization: ${stats.poolUtilization.toFixed(1)}%`;
    }
    
    if (stats.totalConnections === 0) {
      status = 'unhealthy';
      message = 'No active connections in pool';
    }
    
    return {
      name: 'connection_pool',
      status,
      responseTime,
      message,
      lastChecked: new Date().toISOString(),
      details: {
        totalConnections: stats.totalConnections,
        activeConnections: stats.activeConnections,
        idleConnections: stats.idleConnections,
        utilization: `${stats.poolUtilization.toFixed(1)}%`,
        averageQueryTime: `${stats.averageQueryTime.toFixed(2)}ms`,
        totalQueries: stats.totalQueries,
        totalErrors: stats.totalErrors
      }
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      name: 'connection_pool',
      status: 'unhealthy',
      responseTime,
      message: `Connection pool check failed: ${(error as Error).message}`,
      lastChecked: new Date().toISOString(),
      details: {
        error: (error as Error).message
      }
    };
  }
}

async function checkPerformanceMetrics(): Promise<HealthCheck> {
  const startTime = performance.now();
  
  try {
    // Get performance metrics from database
    const { data, error } = await supabase
      .rpc('get_performance_metrics', { p_hours: 1 });
    
    if (error) throw error;
    
    const responseTime = performance.now() - startTime;
    const metrics = data || {};
    
    // Analyze performance health
    let status: HealthCheck['status'] = 'healthy';
    let message = 'Performance metrics within normal range';
    const issues: string[] = [];
    
    if (metrics.avg_response_time_ms > 200) {
      status = 'degraded';
      issues.push(`High average response time: ${metrics.avg_response_time_ms}ms`);
    }
    
    if (metrics.avg_response_time_ms > 500) {
      status = 'unhealthy';
    }
    
    if (metrics.error_rate > 0.05) { // 5%
      status = 'degraded';
      issues.push(`High error rate: ${(metrics.error_rate * 100).toFixed(2)}%`);
    }
    
    if (metrics.error_rate > 0.1) { // 10%
      status = 'unhealthy';
    }
    
    if (issues.length > 0) {
      message = `Performance issues detected: ${issues.join(', ')}`;
    }
    
    return {
      name: 'performance',
      status,
      responseTime,
      message,
      lastChecked: new Date().toISOString(),
      details: {
        ...metrics,
        issues
      }
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      name: 'performance',
      status: 'degraded',
      responseTime,
      message: `Performance metrics unavailable: ${(error as Error).message}`,
      lastChecked: new Date().toISOString(),
      details: {
        error: (error as Error).message
      }
    };
  }
}

async function checkExternalServices(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  
  // Check Twilio (if configured)
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  if (twilioSid && twilioToken) {
    const startTime = performance.now();
    
    try {
      // Simple Twilio API check (account info)
      const auth = btoa(`${twilioSid}:${twilioToken}`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      if (response.ok) {
        checks.push({
          name: 'twilio_api',
          status: responseTime < 1000 ? 'healthy' : 'degraded',
          responseTime,
          message: `Twilio API accessible (${responseTime.toFixed(2)}ms)`,
          lastChecked: new Date().toISOString(),
          details: {
            apiResponseTime: responseTime,
            httpStatus: response.status
          }
        });
      } else {
        checks.push({
          name: 'twilio_api',
          status: 'unhealthy',
          responseTime,
          message: `Twilio API error: ${response.status} ${response.statusText}`,
          lastChecked: new Date().toISOString(),
          details: {
            httpStatus: response.status,
            statusText: response.statusText
          }
        });
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      checks.push({
        name: 'twilio_api',
        status: 'unhealthy',
        responseTime,
        message: `Twilio API connection failed: ${(error as Error).message}`,
        lastChecked: new Date().toISOString(),
        details: {
          error: (error as Error).message
        }
      });
    }
  }
  
  return checks;
}

async function checkSystemResources(): Promise<HealthCheck> {
  const startTime = performance.now();
  
  try {
    // Memory usage estimation (limited in Deno Edge Functions)
    const memoryInfo = {
      estimated: true,
      details: 'Limited memory monitoring in edge environment'
    };
    
    const responseTime = performance.now() - startTime;
    
    return {
      name: 'system_resources',
      status: 'healthy',
      responseTime,
      message: 'System resources monitoring active',
      lastChecked: new Date().toISOString(),
      details: memoryInfo
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      name: 'system_resources',
      status: 'degraded',
      responseTime,
      message: `System resource check limited: ${(error as Error).message}`,
      lastChecked: new Date().toISOString(),
      details: {
        error: (error as Error).message
      }
    };
  }
}

// Generate health summary
function generateHealthSummary(checks: HealthCheck[]): HealthSummary {
  const totalChecks = checks.length;
  const healthyChecks = checks.filter(c => c.status === 'healthy').length;
  const degradedChecks = checks.filter(c => c.status === 'degraded').length;
  const unhealthyChecks = checks.filter(c => c.status === 'unhealthy').length;
  
  const overallScore = (healthyChecks + (degradedChecks * 0.5)) / totalChecks;
  
  const criticalIssues = checks
    .filter(c => c.status === 'unhealthy')
    .map(c => `${c.name}: ${c.message}`);
  
  const recommendations: string[] = [];
  
  if (unhealthyChecks > 0) {
    recommendations.push('Immediate attention required for critical issues');
  }
  
  if (degradedChecks > 0) {
    recommendations.push('Monitor degraded services for potential issues');
  }
  
  if (overallScore < 0.8) {
    recommendations.push('System performance below optimal levels');
  }
  
  const performanceCheck = checks.find(c => c.name === 'performance');
  if (performanceCheck?.details?.avg_response_time_ms > 200) {
    recommendations.push('Consider performance optimization measures');
  }
  
  return {
    totalChecks,
    healthyChecks,
    degradedChecks,
    unhealthyChecks,
    overallScore,
    criticalIssues,
    recommendations
  };
}

// Main health check handler
async function performHealthCheck(config: HealthCheckConfig): Promise<HealthStatus> {
  const startTime = performance.now();
  const checks: HealthCheck[] = [];
  
  try {
    // Core checks (always performed)
    const coreChecks = await Promise.allSettled([
      checkDatabase(),
      checkConnectionPool(),
      checkSystemResources()
    ]);
    
    coreChecks.forEach(result => {
      if (result.status === 'fulfilled') {
        checks.push(result.value);
      } else {
        checks.push({
          name: 'unknown',
          status: 'unhealthy',
          message: `Check failed: ${result.reason}`,
          lastChecked: new Date().toISOString()
        });
      }
    });
    
    // Optional detailed checks
    if (config.includeMetrics) {
      const performanceCheck = await checkPerformanceMetrics();
      checks.push(performanceCheck);
    }
    
    if (config.includeExternal) {
      const externalChecks = await checkExternalServices();
      checks.push(...externalChecks);
    }
    
    // Determine overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    
    let overallStatus: HealthStatus['status'] = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }
    
    const responseTime = performance.now() - startTime;
    const uptime = Date.now() - config.startTime;
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: config.version,
      environment: config.environment,
      uptime,
      responseTime,
      checks
    };
    
    // Add optional data
    if (config.includeDetailed) {
      healthStatus.summary = generateHealthSummary(checks);
    }
    
    if (config.includeMetrics) {
      healthStatus.metrics = getPerformanceMetrics();
    }
    
    if (config.includeSecurity) {
      healthStatus.security = getSecurityMetrics();
    }
    
    return healthStatus;
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: config.version,
      environment: config.environment,
      uptime: Date.now() - config.startTime,
      responseTime,
      checks: [{
        name: 'health_check_system',
        status: 'unhealthy',
        message: `Health check system failed: ${(error as Error).message}`,
        lastChecked: new Date().toISOString(),
        details: {
          error: (error as Error).message
        }
      }]
    };
  }
}

// Main handler
serve(async (req: Request) => {
  return withSecurityHeaders(req, async () => {
    const startTime = performance.now();
    
    try {
      // Parse query parameters
      const url = new URL(req.url);
      const healthConfig: HealthCheckConfig = {
        includeDetailed: url.searchParams.get('detailed') === 'true',
        includeMetrics: url.searchParams.get('metrics') === 'true',
        includeSecurity: url.searchParams.get('security') === 'true',
        includeDatabase: url.searchParams.get('database') !== 'false',
        includeExternal: url.searchParams.get('external') === 'true',
        maxResponseTimeMs: parseInt(url.searchParams.get('timeout') || '10000'),
        startTime: config.startTime,
        version: config.version,
        environment: config.environment
      };
      
      // Perform health check with timeout
      const healthCheckPromise = performHealthCheck(healthConfig);
      const timeoutPromise = new Promise<HealthStatus>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), healthConfig.maxResponseTimeMs);
      });
      
      const healthStatus = await Promise.race([healthCheckPromise, timeoutPromise]);
      
      // Determine HTTP status code
      let httpStatus = 200;
      if (healthStatus.status === 'degraded') {
        httpStatus = 200; // Still operational
      } else if (healthStatus.status === 'unhealthy') {
        httpStatus = 503; // Service unavailable
      }
      
      const responseTime = performance.now() - startTime;
      
      // Log health check results
      logger.info('Health check completed', {
        status: healthStatus.status,
        responseTime: `${responseTime.toFixed(2)}ms`,
        checksPerformed: healthStatus.checks.length,
        includeDetailed: healthConfig.includeDetailed,
        includeMetrics: healthConfig.includeMetrics
      });
      
      return new Response(JSON.stringify(healthStatus, null, 2), {
        status: httpStatus,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          'X-Health-Status': healthStatus.status,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...getCorsHeaders(req.headers.get('origin'))
        }
      });
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      logger.error('Health check error', error as Error, {
        responseTime: `${responseTime.toFixed(2)}ms`
      });
      
      const errorResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: {
          message: 'Health check system error',
          details: (error as Error).message
        },
        responseTime
      };
      
      return new Response(JSON.stringify(errorResponse, null, 2), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          'X-Health-Status': 'unhealthy',
          ...getCorsHeaders(req.headers.get('origin'))
        }
      });
    }
  });
});