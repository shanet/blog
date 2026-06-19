terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.20.0"
    }
  }
}

# Set API token in CLOUDFLARE_API_TOKEN env var
provider "cloudflare" {}

locals {
  account_id       = "2d6e53a7b34ca290aa4bd00eb995a0a0"
  domain_primary   = "ephemeral.cx"
  domain_secondary = "kiratully.com"
  domain_old       = "shanetully.com"
}

module "dns_domain_primary" {
  source = "./dns_domain_primary"

  account_id      = local.account_id
  domain          = local.domain_primary
  pages_subdomain = cloudflare_pages_project.this.subdomain
}

module "dns_domain_secondary" {
  source = "./dns_domain_secondary"

  account_id      = local.account_id
  domain          = local.domain_secondary
  domain_primary  = local.domain_primary
  pages_subdomain = cloudflare_pages_project.this.subdomain
}

module "dns_domain_old" {
  source = "./dns_domain_old"

  account_id      = local.account_id
  domain          = local.domain_old
  domain_primary  = local.domain_primary
  pages_subdomain = cloudflare_pages_project.this.subdomain
}
