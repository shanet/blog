resource "cloudflare_r2_bucket" "files" {
  account_id = local.account_id
  location   = "WNAM" # Western North America
  name       = replace(local.domain_primary, ".", "-")
}

# Custom domain for R2 bucket
resource "cloudflare_r2_custom_domain" "files" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.files.name
  enabled     = true
  domain      = "files.${local.domain_primary}"
  zone_id     = module.dns_domain_primary.zone.id
}
