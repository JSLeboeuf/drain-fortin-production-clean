/**
 * Alert Service
 * Manages system alerts and notifications
 */

import { monitoring } from './monitoring';
import { toast } from 'sonner';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'performance' | 'error' | 'security' | 'business' | 'system';

interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

interface AlertAction {
  label: string;
  action: () => void | Promise<void>;
}

interface AlertThreshold {
  metric: string;
  threshold: number;
  comparison: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  severity: AlertSeverity;
  message: (value: number) => string;
}

class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private subscribers: Set<(alerts: Alert[]) => void> = new Set();
  private thresholds: AlertThreshold[] = [];
  private checkInterval?: number;

  constructor() {
    this.initializeDefaultThresholds();
    this.startMonitoring();
  }

  private initializeDefaultThresholds() {
    // Performance thresholds
    this.addThreshold({
      metric: 'LCP',
      threshold: 2500,
      comparison: 'gt',
      severity: 'warning',
      message: (value) => `Largest Contentful Paint is ${value}ms (target: <2500ms)`,
    });

    this.addThreshold({
      metric: 'FID',
      threshold: 100,
      comparison: 'gt',
      severity: 'warning',
      message: (value) => `First Input Delay is ${value}ms (target: <100ms)`,
    });

    this.addThreshold({
      metric: 'CLS',
      threshold: 0.1,
      comparison: 'gt',
      severity: 'warning',
      message: (value) => `Cumulative Layout Shift is ${value} (target: <0.1)`,
    });

    // Business thresholds
    this.addThreshold({
      metric: 'WebhookResponseTime',
      threshold: 3000,
      comparison: 'gt',
      severity: 'critical',
      message: (value) => `Webhook response time exceeded 3s: ${value}ms`,
    });

    this.addThreshold({
      metric: 'ErrorRate',
      threshold: 5,
      comparison: 'gt',
      severity: 'critical',
      message: (value) => `Error rate is high: ${value} errors in last minute`,
    });

    // System thresholds
    this.addThreshold({
      metric: 'MemoryUsage',
      threshold: 90,
      comparison: 'gt',
      severity: 'warning',
      message: (value) => `Memory usage is high: ${value}%`,
    });

    this.addThreshold({
      metric: 'APILatency',
      threshold: 1000,
      comparison: 'gt',
      severity: 'warning',
      message: (value) => `API latency is high: ${value}ms`,
    });
  }

  private startMonitoring() {
    // Check thresholds every 30 seconds
    this.checkInterval = window.setInterval(() => {
      this.checkThresholds();
      this.checkHealthStatus();
      this.checkErrorRate();
    }, 30000);

    // Initial check
    this.checkThresholds();
  }

  private checkThresholds() {
    const metrics = monitoring.getMetrics();
    
    // Group metrics by name and get latest value
    const latestMetrics = new Map<string, number>();
    metrics.forEach(metric => {
      latestMetrics.set(metric.name, metric.value);
    });

    // Check each threshold
    this.thresholds.forEach(threshold => {
      const value = latestMetrics.get(threshold.metric);
      if (value === undefined) return;

      const triggered = this.compareValue(value, threshold.threshold, threshold.comparison);
      
      if (triggered) {
        this.createAlert({
          severity: threshold.severity,
          category: 'performance',
          title: `Performance Threshold Exceeded`,
          message: threshold.message(value),
          metadata: {
            metric: threshold.metric,
            value,
            threshold: threshold.threshold,
          },
        });
      }
    });
  }

  private checkHealthStatus() {
    const health = monitoring.getHealthStatus();
    
    Object.entries(health).forEach(([service, check]) => {
      if (check.status === 'unhealthy') {
        this.createAlert({
          severity: 'critical',
          category: 'system',
          title: `Service Unhealthy: ${service}`,
          message: check.message || `${service} service is not responding`,
          metadata: {
            service,
            latency: check.latency,
            lastCheck: check.lastCheck,
          },
          actions: [
            {
              label: 'Retry',
              action: () => {
                // Trigger manual health check
                monitoring.checkAPIHealth();
              },
            },
          ],
        });
      } else if (check.status === 'degraded') {
        this.createAlert({
          severity: 'warning',
          category: 'system',
          title: `Service Degraded: ${service}`,
          message: check.message || `${service} service is experiencing issues`,
          metadata: {
            service,
            latency: check.latency,
          },
        });
      }
    });
  }

  private checkErrorRate() {
    const errors = monitoring.getErrors();
    const recentErrors = errors.filter(e => 
      Date.now() - e.timestamp < 60000 // Last minute
    );

    if (recentErrors.length > 5) {
      this.createAlert({
        severity: 'critical',
        category: 'error',
        title: 'High Error Rate',
        message: `${recentErrors.length} errors in the last minute`,
        metadata: {
          errors: recentErrors,
        },
        actions: [
          {
            label: 'View Errors',
            action: () => {
              console.error('Recent errors:', recentErrors);
            },
          },
        ],
      });
    }
  }

  private compareValue(value: number, threshold: number, comparison: AlertThreshold['comparison']): boolean {
    switch (comparison) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  public createAlert(options: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id,
      ...options,
      timestamp: Date.now(),
      resolved: false,
    };

    // Check if similar alert already exists
    const existingAlert = Array.from(this.alerts.values()).find(a => 
      !a.resolved &&
      a.severity === alert.severity &&
      a.category === alert.category &&
      a.title === alert.title
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.timestamp = Date.now();
      existingAlert.metadata = { ...existingAlert.metadata, ...alert.metadata };
      this.notifySubscribers();
      return existingAlert.id;
    }

    this.alerts.set(id, alert);
    this.notifySubscribers();
    
    // Show toast notification
    this.showToast(alert);
    
    // Log to monitoring
    monitoring.recordError({
      message: `Alert: ${alert.title}`,
      level: alert.severity === 'critical' ? 'error' : 'warning',
      context: {
        alert,
      },
    });

    // Auto-resolve info alerts after 30 seconds
    if (alert.severity === 'info') {
      setTimeout(() => this.resolveAlert(id), 30000);
    }

    return id;
  }

  public resolveAlert(id: string) {
    const alert = this.alerts.get(id);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.notifySubscribers();
    }
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.resolved)
      .sort((a, b) => {
        // Sort by severity, then by timestamp
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.timestamp - a.timestamp;
      });
  }

  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public subscribe(callback: (alerts: Alert[]) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    const activeAlerts = this.getActiveAlerts();
    this.subscribers.forEach(callback => callback(activeAlerts));
  }

  private showToast(alert: Alert) {
    const options = {
      duration: alert.severity === 'critical' ? Infinity : 5000,
      action: alert.actions?.[0] ? {
        label: alert.actions[0].label,
        onClick: alert.actions[0].action,
      } : undefined,
    };

    switch (alert.severity) {
      case 'critical':
        toast.error(alert.title, {
          ...options,
          description: alert.message,
        });
        break;
      case 'warning':
        toast.warning(alert.title, {
          ...options,
          description: alert.message,
        });
        break;
      case 'info':
        toast.info(alert.title, {
          ...options,
          description: alert.message,
        });
        break;
    }
  }

  public addThreshold(threshold: AlertThreshold) {
    this.thresholds.push(threshold);
  }

  public removeThreshold(metric: string) {
    this.thresholds = this.thresholds.filter(t => t.metric !== metric);
  }

  public clearAlerts() {
    this.alerts.clear();
    this.notifySubscribers();
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.subscribers.clear();
    this.alerts.clear();
  }
}

// Singleton instance
export const alertService = new AlertService();

// Export types
export type { Alert, AlertAction, AlertThreshold };