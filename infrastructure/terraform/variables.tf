# ==========================================
# TERRAFORM VARIABLES
# Drain Fortin Infrastructure
# ==========================================

# ==========================================
# ENVIRONMENT CONFIGURATION
# ==========================================
variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "drain-fortin"
}

# ==========================================
# DOMAIN & DNS CONFIGURATION
# ==========================================
variable "domain_name" {
  description = "Main domain name"
  type        = string
  default     = "drainfortin.com"
}

variable "subdomain_prefix" {
  description = "Subdomain prefix for non-production environments"
  type        = string
  default     = ""
}

# ==========================================
# VERCEL CONFIGURATION
# ==========================================
variable "vercel_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team/organization ID"
  type        = string
  sensitive   = true
}

variable "vercel_framework" {
  description = "Frontend framework"
  type        = string
  default     = "vite"
}

# ==========================================
# GITHUB CONFIGURATION
# ==========================================
variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "github_organization" {
  description = "GitHub organization name"
  type        = string
  default     = "your-org"
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = "drain-fortin-production-clean"
}

# ==========================================
# SUPABASE CONFIGURATION
# ==========================================
variable "supabase_access_token" {
  description = "Supabase access token"
  type        = string
  sensitive   = true
}

variable "supabase_project_ref" {
  description = "Supabase project reference ID"
  type        = string
  sensitive   = true
}

variable "supabase_project_ref_staging" {
  description = "Supabase staging project reference ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

# ==========================================
# VAPI CONFIGURATION
# ==========================================
variable "vapi_api_key" {
  description = "VAPI API key"
  type        = string
  sensitive   = true
}

variable "vapi_webhook_secret" {
  description = "VAPI webhook secret"
  type        = string
  sensitive   = true
}

variable "vapi_assistant_id" {
  description = "VAPI assistant ID"
  type        = string
  sensitive   = true
}

variable "vapi_phone_number" {
  description = "VAPI phone number"
  type        = string
  default     = "+15145296037"
}

# ==========================================
# TWILIO CONFIGURATION
# ==========================================
variable "twilio_account_sid" {
  description = "Twilio account SID"
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio auth token"
  type        = string
  sensitive   = true
}

variable "twilio_phone_number" {
  description = "Twilio phone number"
  type        = string
  default     = "+15145296037"
}

# ==========================================
# CLOUDFLARE CONFIGURATION
# ==========================================
variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
  sensitive   = true
}

# ==========================================
# MONITORING & ALERTING
# ==========================================
variable "notification_email" {
  description = "Email address for notifications and alerts"
  type        = string
  default     = "admin@drainfortin.com"
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "uptime_check_frequency" {
  description = "Uptime check frequency in minutes"
  type        = number
  default     = 5
}

# ==========================================
# SECURITY CONFIGURATION
# ==========================================
variable "security_level" {
  description = "Cloudflare security level"
  type        = string
  default     = "medium"
  
  validation {
    condition     = contains(["off", "essentially_off", "low", "medium", "high", "under_attack"], var.security_level)
    error_message = "Security level must be one of: off, essentially_off, low, medium, high, under_attack."
  }
}

variable "rate_limit_threshold" {
  description = "Rate limit threshold per minute"
  type        = number
  default     = 100
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection"
  type        = bool
  default     = true
}

# ==========================================
# PERFORMANCE CONFIGURATION
# ==========================================
variable "cache_ttl" {
  description = "Cache TTL in seconds for static assets"
  type        = number
  default     = 31536000 # 1 year
}

variable "enable_compression" {
  description = "Enable compression"
  type        = bool
  default     = true
}

variable "enable_http2" {
  description = "Enable HTTP/2"
  type        = bool
  default     = true
}

# ==========================================
# BACKUP CONFIGURATION
# ==========================================
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_frequency" {
  description = "Backup frequency (daily, weekly)"
  type        = string
  default     = "daily"
  
  validation {
    condition     = contains(["daily", "weekly"], var.backup_frequency)
    error_message = "Backup frequency must be either daily or weekly."
  }
}

# ==========================================
# RESOURCE TAGS
# ==========================================
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "drain-fortin"
    Owner       = "jean-samuel-leboeuf"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}