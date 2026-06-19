terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
    }
  }
}

variable "domain_from" {}
variable "domain_to" {}
variable "zone_id" {}

resource "cloudflare_ruleset" "redirect" {
  description = "Redirect all ${var.domain_from} traffic to ${var.domain_to}"
  kind        = "zone"
  name        = "Redirect to ${var.domain_to}"
  phase       = "http_request_dynamic_redirect"
  zone_id     = var.zone_id

  rules = [{
    action      = "redirect"
    description = "Redirect all requests to ${var.domain_to}"
    enabled     = true
    expression  = "(http.host eq \"${var.domain_from}\" or http.host eq \"www.${var.domain_from}\")"

    action_parameters = {
      from_value = {
        preserve_query_string = true
        status_code           = 301

        target_url = {
          expression = "concat(\"https://${var.domain_to}\", http.request.uri.path)"
        }
      }
    }
  }]
}
