# ==========================================
# DRAIN FORTIN INFRASTRUCTURE AS CODE
# Terraform Configuration
# ==========================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "drain-fortin-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "drain-fortin-terraform-locks"
  }
}

# ==========================================
# VARIABLES
# ==========================================
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Main domain name"
  type        = string
  default     = "drainfortin.com"
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = "drain-fortin-production-clean"
}

variable "vercel_team_id" {
  description = "Vercel team ID"
  type        = string
  sensitive   = true
}

variable "supabase_project_ref" {
  description = "Supabase project reference"
  type        = string
  sensitive   = true
}

variable "notification_email" {
  description = "Email for notifications"
  type        = string
  default     = "admin@drainfortin.com"
}

# ==========================================
# DATA SOURCES
# ==========================================
data "github_repository" "main" {
  full_name = "your-org/${var.github_repository}"
}

# ==========================================
# VERCEL DEPLOYMENT
# ==========================================
resource "vercel_project" "frontend" {
  name      = "drain-fortin-${var.environment}"
  framework = "vite"
  
  git_repository = {
    type = "github"
    repo = data.github_repository.main.full_name
  }

  build_command    = "cd frontend && npm run build"
  output_directory = "frontend/dist"
  install_command  = "cd frontend && npm ci"

  environment = [
    {
      key    = "VITE_SUPABASE_URL"
      value  = "https://${var.supabase_project_ref}.supabase.co"
      target = ["production"]
    },
    {
      key    = "VITE_SUPABASE_ANON_KEY"
      value  = var.supabase_anon_key
      target = ["production"]
    },
    {
      key    = "NODE_ENV"
      value  = "production"
      target = ["production"]
    }
  ]

  domains = [
    {
      name = var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"
    }
  ]
}

# ==========================================
# CLOUDFLARE DNS & SECURITY
# ==========================================
data "cloudflare_zone" "main" {
  name = var.domain_name
}

resource "cloudflare_record" "main" {
  zone_id = data.cloudflare_zone.main.id
  name    = var.environment == "production" ? "@" : var.environment
  value   = vercel_project.frontend.domains[0].target
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "www" {
  count   = var.environment == "production" ? 1 : 0
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  value   = var.domain_name
  type    = "CNAME"
  proxied = true
}

# Page Rules for performance
resource "cloudflare_page_rule" "cache_everything" {
  zone_id = data.cloudflare_zone.main.id
  target  = "${var.domain_name}/assets/*"

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 31536000 # 1 year
  }
}

resource "cloudflare_page_rule" "security_headers" {
  zone_id = data.cloudflare_zone.main.id
  target  = "${var.domain_name}/*"

  actions {
    security_level = "medium"
    ssl           = "strict"
  }
}

# ==========================================
# GITHUB REPOSITORY SECRETS
# ==========================================
resource "github_actions_secret" "vercel_token" {
  repository      = data.github_repository.main.name
  secret_name     = "VERCEL_TOKEN"
  plaintext_value = var.vercel_token
}

resource "github_actions_secret" "vercel_org_id" {
  repository      = data.github_repository.main.name
  secret_name     = "VERCEL_ORG_ID"
  plaintext_value = var.vercel_team_id
}

resource "github_actions_secret" "vercel_project_id" {
  repository      = data.github_repository.main.name
  secret_name     = "VERCEL_PROJECT_ID"
  plaintext_value = vercel_project.frontend.id
}

resource "github_actions_secret" "supabase_access_token" {
  repository      = data.github_repository.main.name
  secret_name     = "SUPABASE_ACCESS_TOKEN"
  plaintext_value = var.supabase_access_token
}

resource "github_actions_secret" "production_url" {
  repository      = data.github_repository.main.name
  secret_name     = "PRODUCTION_URL"
  plaintext_value = "https://${var.domain_name}"
}

# ==========================================
# MONITORING & ALERTING
# ==========================================
resource "cloudflare_notification_policy" "ssl_expiry" {
  name    = "SSL Certificate Expiry - ${var.environment}"
  enabled = true

  alert_type = "universal_ssl_event_type"
  
  email_integration {
    name  = "Admin Email"
    email = var.notification_email
  }

  filters {
    zones = [data.cloudflare_zone.main.id]
  }
}

resource "cloudflare_notification_policy" "ddos_attack" {
  name    = "DDoS Attack Detected - ${var.environment}"
  enabled = true

  alert_type = "dos_attack_l7"
  
  email_integration {
    name  = "Admin Email"
    email = var.notification_email
  }

  filters {
    zones = [data.cloudflare_zone.main.id]
  }
}

# ==========================================
# OUTPUTS
# ==========================================
output "frontend_url" {
  description = "Frontend application URL"
  value       = "https://${vercel_project.frontend.domains[0].name}"
}

output "vercel_project_id" {
  description = "Vercel project ID"
  value       = vercel_project.frontend.id
}

output "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  value       = data.cloudflare_zone.main.id
}

output "deployment_status" {
  description = "Infrastructure deployment status"
  value = {
    environment = var.environment
    domain      = var.domain_name
    frontend    = vercel_project.frontend.domains[0].name
    ssl_status  = "enabled"
    cdn_status  = "enabled"
  }
}