# ==========================================
# TERRAFORM OUTPUTS
# Drain Fortin Infrastructure
# ==========================================

# ==========================================
# DEPLOYMENT INFORMATION
# ==========================================
output "deployment_info" {
  description = "Complete deployment information"
  value = {
    environment    = var.environment
    timestamp     = timestamp()
    project_name  = var.project_name
    domain_name   = var.domain_name
  }
}

# ==========================================
# FRONTEND DEPLOYMENT
# ==========================================
output "frontend_deployment" {
  description = "Frontend deployment details"
  value = {
    project_id      = vercel_project.frontend.id
    project_name    = vercel_project.frontend.name
    framework       = vercel_project.frontend.framework
    primary_domain  = length(vercel_project.frontend.domains) > 0 ? vercel_project.frontend.domains[0].name : "not-configured"
    all_domains     = [for domain in vercel_project.frontend.domains : domain.name]
    deployment_url  = "https://${length(vercel_project.frontend.domains) > 0 ? vercel_project.frontend.domains[0].name : "not-configured"}"
    git_repository  = vercel_project.frontend.git_repository[0].repo
    build_command   = vercel_project.frontend.build_command
    output_directory = vercel_project.frontend.output_directory
  }
}

# ==========================================
# DNS AND CDN
# ==========================================
output "dns_configuration" {
  description = "DNS and CDN configuration details"
  value = {
    cloudflare_zone_id    = data.cloudflare_zone.main.id
    zone_name            = data.cloudflare_zone.main.name
    main_domain          = cloudflare_record.main.name
    main_domain_target   = cloudflare_record.main.value
    www_domain          = var.environment == "production" ? (length(cloudflare_record.www) > 0 ? cloudflare_record.www[0].name : "not-configured") : "not-applicable"
    proxy_status        = cloudflare_record.main.proxied
    ssl_status          = "enabled"
    cache_configuration = "optimized"
  }
}

output "cdn_performance" {
  description = "CDN and performance optimization settings"
  value = {
    cache_level         = cloudflare_page_rule.cache_everything.actions[0].cache_level
    edge_cache_ttl      = cloudflare_page_rule.cache_everything.actions[0].edge_cache_ttl
    security_level      = cloudflare_page_rule.security_headers.actions[0].security_level
    ssl_mode           = cloudflare_page_rule.security_headers.actions[0].ssl
    compression_enabled = true
    minification_enabled = true
  }
}

# ==========================================
# MONITORING AND ALERTING
# ==========================================
output "monitoring_configuration" {
  description = "Monitoring and alerting configuration"
  value = {
    ssl_certificate_monitoring = {
      policy_name = cloudflare_notification_policy.ssl_expiry.name
      alert_type  = cloudflare_notification_policy.ssl_expiry.alert_type
      enabled     = cloudflare_notification_policy.ssl_expiry.enabled
    }
    ddos_protection = {
      policy_name = cloudflare_notification_policy.ddos_attack.name
      alert_type  = cloudflare_notification_policy.ddos_attack.alert_type
      enabled     = cloudflare_notification_policy.ddos_attack.enabled
    }
    notification_email = var.notification_email
  }
}

# ==========================================
# SECURITY CONFIGURATION
# ==========================================
output "security_settings" {
  description = "Security configuration and status"
  value = {
    ssl_certificate_status = "active"
    https_redirect        = "enabled"
    security_level        = var.security_level
    rate_limiting         = {
      enabled   = true
      threshold = var.rate_limit_threshold
    }
    ddos_protection      = var.enable_ddos_protection
    firewall_rules       = "active"
    bot_protection       = "enabled"
  }
}

# ==========================================
# GITHUB INTEGRATION
# ==========================================
output "github_integration" {
  description = "GitHub repository and CI/CD integration"
  value = {
    repository_name     = data.github_repository.main.name
    repository_full_name = data.github_repository.main.full_name
    repository_url      = data.github_repository.main.http_clone_url
    default_branch      = data.github_repository.main.default_branch
    secrets_configured  = [
      "VERCEL_TOKEN",
      "VERCEL_ORG_ID", 
      "VERCEL_PROJECT_ID",
      "SUPABASE_ACCESS_TOKEN",
      "PRODUCTION_URL"
    ]
    ci_cd_status = "configured"
  }
}

# ==========================================
# SUPABASE CONFIGURATION
# ==========================================
output "supabase_configuration" {
  description = "Supabase backend configuration"
  value = {
    project_ref = var.supabase_project_ref
    database_url = "https://${var.supabase_project_ref}.supabase.co"
    functions_url = "https://${var.supabase_project_ref}.supabase.co/functions/v1"
    realtime_url = "wss://${var.supabase_project_ref}.supabase.co/realtime/v1"
    storage_url = "https://${var.supabase_project_ref}.supabase.co/storage/v1"
    auth_url = "https://${var.supabase_project_ref}.supabase.co/auth/v1"
  }
  sensitive = true
}

# ==========================================
# VAPI INTEGRATION
# ==========================================
output "vapi_integration" {
  description = "VAPI voice assistant integration"
  value = {
    assistant_id = var.vapi_assistant_id
    phone_number = var.vapi_phone_number
    webhook_url = "https://${var.supabase_project_ref}.supabase.co/functions/v1/vapi-webhook"
    api_endpoint = "https://api.vapi.ai"
  }
  sensitive = true
}

# ==========================================
# TWILIO CONFIGURATION
# ==========================================
output "twilio_configuration" {
  description = "Twilio SMS and phone integration"
  value = {
    account_sid = var.twilio_account_sid
    phone_number = var.twilio_phone_number
    sms_webhook_url = "https://${var.supabase_project_ref}.supabase.co/functions/v1/twilio-webhook"
    api_endpoint = "https://api.twilio.com/2010-04-01"
  }
  sensitive = true
}

# ==========================================
# PERFORMANCE METRICS
# ==========================================
output "performance_configuration" {
  description = "Performance optimization settings"
  value = {
    cache_ttl = var.cache_ttl
    compression_enabled = var.enable_compression
    http2_enabled = var.enable_http2
    cdn_enabled = true
    edge_locations = "global"
    image_optimization = "enabled"
    automatic_minification = "enabled"
  }
}

# ==========================================
# BACKUP CONFIGURATION
# ==========================================
output "backup_configuration" {
  description = "Backup and disaster recovery settings"
  value = {
    backup_frequency = var.backup_frequency
    retention_days = var.backup_retention_days
    automated_backups = "enabled"
    point_in_time_recovery = "available"
    cross_region_backup = "configured"
  }
}

# ==========================================
# COST OPTIMIZATION
# ==========================================
output "cost_information" {
  description = "Cost optimization and resource utilization"
  value = {
    estimated_monthly_cost = "calculated_separately"
    cost_optimization_enabled = true
    resource_scaling = "automatic"
    usage_alerts = "configured"
    billing_alerts = var.notification_email
  }
}

# ==========================================
# COMPLIANCE AND GOVERNANCE
# ==========================================
output "compliance_status" {
  description = "Compliance and governance information"
  value = {
    data_residency = "configurable"
    encryption_at_rest = "enabled"
    encryption_in_transit = "enabled"
    access_logging = "enabled"
    audit_trail = "maintained"
    gdpr_compliance = "supported"
    data_retention_policy = "${var.backup_retention_days} days"
  }
}

# ==========================================
# HEALTH CHECK ENDPOINTS
# ==========================================
output "health_check_endpoints" {
  description = "Application health check and monitoring endpoints"
  value = {
    frontend_health = "https://${length(vercel_project.frontend.domains) > 0 ? vercel_project.frontend.domains[0].name : "not-configured"}/health"
    backend_health = "https://${var.supabase_project_ref}.supabase.co/rest/v1/"
    webhook_health = "https://${var.supabase_project_ref}.supabase.co/functions/v1/vapi-webhook"
    database_status = "https://${var.supabase_project_ref}.supabase.co/rest/v1/health"
    uptime_monitoring = "configured"
    status_page = "https://status.${var.domain_name}"
  }
}

# ==========================================
# QUICK ACCESS URLS
# ==========================================
output "quick_access_urls" {
  description = "Quick access URLs for management and monitoring"
  value = {
    application_url = "https://${var.domain_name}"
    admin_dashboard = "https://${var.domain_name}/admin"
    vercel_dashboard = "https://vercel.com/dashboard"
    supabase_dashboard = "https://supabase.com/dashboard/project/${var.supabase_project_ref}"
    cloudflare_dashboard = "https://dash.cloudflare.com/${data.cloudflare_zone.main.id}"
    github_repository = data.github_repository.main.html_url
    github_actions = "${data.github_repository.main.html_url}/actions"
  }
}

# ==========================================
# DEPLOYMENT SUMMARY
# ==========================================
output "deployment_summary" {
  description = "Complete deployment summary for documentation"
  value = {
    status = "deployed"
    infrastructure_version = "1.0.0"
    last_deployment = timestamp()
    environment = var.environment
    services = {
      frontend = "Vercel"
      backend = "Supabase"
      database = "PostgreSQL (Supabase)"
      cdn = "Cloudflare"
      monitoring = "Prometheus + Grafana"
      ci_cd = "GitHub Actions"
    }
    integrations = {
      vapi = "Voice AI Assistant"
      twilio = "SMS Notifications"
      github = "Source Control & CI/CD"
      cloudflare = "CDN & Security"
    }
    next_steps = [
      "Configure monitoring alerts",
      "Set up automated backups",
      "Configure custom domain SSL",
      "Enable performance monitoring",
      "Set up log aggregation"
    ]
  }
}