terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
    }
  }
}

variable "account_id" {}
variable "domain" {}
variable "pages_subdomain" {}

resource "cloudflare_zone" "this" {
  account = {id = var.account_id}
  name    = var.domain
}

resource "cloudflare_dns_record" "apex" {
  content = var.pages_subdomain
  name    = "@"
  proxied = true
  ttl     = 1
  type    = "CNAME"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "www" {
  content = var.pages_subdomain
  name    = "www"
  proxied = true
  ttl     = 1
  type    = "CNAME"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "bluesky" {
  content = "\"did=did:plc:2doq3y22rmwzcdumb5tpz6oc\""
  name    = "_atproto"
  ttl     = 3600 # seconds
  type    = "TXT"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "google" {
  content = "\"google-site-verification=O4_XaMg_EFxvIxN9scQZdH86GEBof8mp3V_-o_MGFww\""
  name    = "@"
  ttl     = 3600 # seconds
  type    = "TXT"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "discord" {
  content = "\"dh=25b11eac31caedb577a591fce39b4fb74fd10c08\""
  name    = "_discord"
  ttl     = 3600 # seconds
  type    = "TXT"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "webb_a" {
  content = "93.185.167.221"
  name    = "webb"
  ttl     = 3600 # seconds
  type    = "A"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "webb_aaaa" {
  content = "2a0f:5f40:0:5::316"
  name    = "webb"
  ttl     = 3600 # seconds
  type    = "AAAA"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "apartment" {
  content = "1.1.1.1"
  name    = "apartment"
  ttl     = 1
  type    = "A"
  zone_id = cloudflare_zone.this.id

  lifecycle {
    # This is a dynamic DNS record and will be updated periodically outside of Terraform
    ignore_changes = [content]
   }
}

resource "cloudflare_dns_record" "home" {
  content = "1.1.1.1"
  name    = "home"
  ttl     = 1
  type    = "A"
  zone_id = cloudflare_zone.this.id

  lifecycle {
    # This is a dynamic DNS record and will be updated periodically outside of Terraform
    ignore_changes = [content]
   }
}

output "zone" {
  value = cloudflare_zone.this
}
