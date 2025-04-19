# Terraform Version Constraints
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    template = {
      source  = "hashicorp/template"
      version = "~> 2.0"
    }
  }
}

# Module Versions
locals {
  module_versions = {
    vpc = {
      source  = "terraform-aws-modules/vpc/aws"
      version = "~> 5.0"
    }
    eks = {
      source  = "terraform-aws-modules/eks/aws"
      version = "~> 19.0"
    }
    rds = {
      source  = "terraform-aws-modules/rds/aws"
      version = "~> 5.0"
    }
    elasticache = {
      source  = "terraform-aws-modules/elasticache/aws"
      version = "~> 3.0"
    }
    s3_bucket = {
      source  = "terraform-aws-modules/s3-bucket/aws"
      version = "~> 3.0"
    }
    alb = {
      source  = "terraform-aws-modules/alb/aws"
      version = "~> 8.0"
    }
    acm = {
      source  = "terraform-aws-modules/acm/aws"
      version = "~> 4.0"
    }
    security_group = {
      source  = "terraform-aws-modules/security-group/aws"
      version = "~> 4.0"
    }
  }
}

# Provider Configuration Aliases
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us-west-2"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu-west-1"
  region = "eu-west-1"
}

# Version Constraints for Third-Party Modules
locals {
  third_party_modules = {
    cert_manager = {
      repository = "https://charts.jetstack.io"
      chart      = "cert-manager"
      version    = "v1.11.0"
    }
    prometheus = {
      repository = "https://prometheus-community.github.io/helm-charts"
      chart      = "prometheus"
      version    = "15.10.1"
    }
    grafana = {
      repository = "https://grafana.github.io/helm-charts"
      chart      = "grafana"
      version    = "6.43.1"
    }
    elasticsearch = {
      repository = "https://helm.elastic.co"
      chart      = "elasticsearch"
      version    = "7.17.3"
    }
    fluentd = {
      repository = "https://fluent.github.io/helm-charts"
      chart      = "fluentd"
      version    = "0.3.9"
    }
    kibana = {
      repository = "https://helm.elastic.co"
      chart      = "kibana"
      version    = "7.17.3"
    }
  }
}

# Version Check Resource
resource "null_resource" "version_check" {
  triggers = {
    terraform_version = "1.0.0"
    provider_versions = jsonencode({
      aws        = "4.0.0"
      kubernetes = "2.0.0"
      helm       = "2.0.0"
    })
    module_versions = jsonencode(local.module_versions)
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Version Compatibility Check
locals {
  version_compatibility = {
    kubernetes_version = "1.27"
    eks_version       = "1.27"
    node_version      = "1.27"
  }

  version_constraints = {
    min_terraform_version = "1.0.0"
    max_terraform_version = "2.0.0"
    required_providers = {
      aws = {
        min_version = "4.0.0"
        max_version = "5.0.0"
      }
      kubernetes = {
        min_version = "2.0.0"
        max_version = "3.0.0"
      }
      helm = {
        min_version = "2.0.0"
        max_version = "3.0.0"
      }
    }
  }
}

# Version Validation
resource "null_resource" "version_validation" {
  count = terraform.workspace == "default" ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      if [ "$(terraform version | head -n1 | cut -d'v' -f2)" \< "${local.version_constraints.min_terraform_version}" ]; then
        echo "Error: Terraform version must be at least ${local.version_constraints.min_terraform_version}"
        exit 1
      fi
    EOT
  }

  lifecycle {
    create_before_destroy = true
  }
}
