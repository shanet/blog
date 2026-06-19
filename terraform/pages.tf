resource "cloudflare_pages_project" "this" {
  account_id        = local.account_id
  name              = replace(local.domain_primary, ".", "-")
  production_branch = "production"
}

resource "cloudflare_pages_domain" "apex" {
  account_id   = local.account_id
  name         = local.domain_primary
  project_name = cloudflare_pages_project.this.name
}

resource "cloudflare_pages_domain" "www" {
  account_id   = local.account_id
  name         = "www.${local.domain_primary}"
  project_name = cloudflare_pages_project.this.name
}
