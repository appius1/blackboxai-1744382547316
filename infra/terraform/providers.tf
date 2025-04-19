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
  }
}

# AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Kubernetes Provider
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      local.cluster_name
    ]
  }
}

# Helm Provider
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        local.cluster_name
      ]
    }
  }
}

# Random Provider
provider "random" {}

# TLS Provider
provider "tls" {}

# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Provider Configurations
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"  # Required for ACM certificates used with CloudFront

  default_tags {
    tags = local.common_tags
  }
}

# Additional Provider Requirements
provider "kubernetes" {
  alias = "eks"  # For use with multiple clusters if needed

  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      local.cluster_name
    ]
  }
}

provider "helm" {
  alias = "eks"  # For use with multiple clusters if needed

  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        local.cluster_name
      ]
    }
  }
}

# Version Constraints
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
      configuration_aliases = [aws.us-east-1]
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
      configuration_aliases = [kubernetes.eks]
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
      configuration_aliases = [helm.eks]
    }
  }
}
