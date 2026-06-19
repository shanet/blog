terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
    }
  }
}

variable "account_id" {}
variable "domain" {}
variable "domain_primary" {}
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

resource "cloudflare_dns_record" "dmarc" {
  content = "\"v=DMARC1; p=quarantine\""
  name    = "_dmarc"
  ttl     = 3600 # seconds
  type    = "TXT"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "google" {
  content = "\"google-site-verification=f6Qh-JSYVS6XUE2rtLM9ORUkngng6pIg4cmqIeLWFr4\""
  name    = "@"
  ttl     = 3600 # seconds
  type    = "TXT"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "protonmail_domainkey_1" {
  content = "protonmail.domainkey.dvgpzazohyo4s6ycxlykt6vn247kuhvj2pqwvoxcbose3wfbygtdq.domains.proton.ch"
  name    = "protonmail._domainkey"
  ttl     = 3600 # seconds
  type    = "CNAME"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "protonmail_domainkey_2" {
  content = "protonmail2.domainkey.dvgpzazohyo4s6ycxlykt6vn247kuhvj2pqwvoxcbose3wfbygtdq.domains.proton.ch"
  name    = "protonmail2._domainkey"
  ttl     = 3600 # seconds
  type    = "CNAME"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "protonmail_domainkey_3" {
  content = "protonmail3.domainkey.dvgpzazohyo4s6ycxlykt6vn247kuhvj2pqwvoxcbose3wfbygtdq.domains.proton.ch"
  name    = "protonmail3._domainkey"
  ttl     = 3600 # seconds
  type    = "CNAME"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "protonmail_verification" {
  content = "\"protonmail-verification=f499827ef21d21155ab54d812909a5772bfa3ac3\""
  name    = "@"
  ttl     = 3600 # seconds
  type    = "TXT"
  zone_id = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "mx1" {
  content  = "mail.protonmail.ch"
  name     = "@"
  priority = 10
  ttl      = 3600 # seconds
  type     = "MX"
  zone_id  = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "mx2" {
  content  = "mailsec.protonmail.ch"
  name     = "@"
  priority = 20
  ttl      = 3600 # seconds
  type     = "MX"
  zone_id  = cloudflare_zone.this.id
}

resource "cloudflare_dns_record" "spf" {
  content = "\"v=spf1 include:_spf.protonmail.ch mx ~all\""
  name    = "@"
  ttl     = 3600 # seconds
  type    = "TXT"
  zone_id = cloudflare_zone.this.id
}

module "redirect" {
  source = "../redirects"

  domain_from = var.domain
  domain_to   = var.domain_primary
  zone_id     = cloudflare_zone.this.id
}
