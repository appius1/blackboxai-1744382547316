# AWS Account Information
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Data
data "aws_vpc" "selected" {
  id = module.vpc.vpc_id
}

data "aws_subnet_ids" "private" {
  vpc_id = data.aws_vpc.selected.id

  tags = {
    Tier = "Private"
  }
}

data "aws_subnet_ids" "public" {
  vpc_id = data.aws_vpc.selected.id

  tags = {
    Tier = "Public"
  }
}

# EKS Data
data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_id
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_id
}

# IAM Data
data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "eks_cluster_autoscaler" {
  statement {
    effect = "Allow"
    actions = [
      "autoscaling:DescribeAutoScalingGroups",
      "autoscaling:DescribeAutoScalingInstances",
      "autoscaling:DescribeLaunchConfigurations",
      "autoscaling:DescribeTags",
      "autoscaling:SetDesiredCapacity",
      "autoscaling:TerminateInstanceInAutoScalingGroup",
      "ec2:DescribeLaunchTemplateVersions"
    ]
    resources = ["*"]
  }
}

# ACM Certificate
data "aws_acm_certificate" "issued" {
  domain      = "*.${var.domain_name}"
  statuses    = ["ISSUED"]
  most_recent = true
}

# Route53 Zone
data "aws_route53_zone" "selected" {
  name         = var.domain_name
  private_zone = false
}

# AMI Data
data "aws_ami" "eks_worker" {
  filter {
    name   = "name"
    values = ["amazon-eks-node-${data.aws_eks_cluster.cluster.version}-v*"]
  }

  most_recent = true
  owners      = ["amazon"]
}

# Security Group Data
data "aws_security_group" "default" {
  vpc_id = data.aws_vpc.selected.id

  filter {
    name   = "group-name"
    values = ["default"]
  }
}

# KMS Keys
data "aws_kms_alias" "rds" {
  name = "alias/aws/rds"
}

data "aws_kms_alias" "s3" {
  name = "alias/aws/s3"
}

# SSM Parameters
data "aws_ssm_parameter" "db_username" {
  name = "/appius/${var.environment}/database/username"
}

data "aws_ssm_parameter" "db_password" {
  name = "/appius/${var.environment}/database/password"
}

# CloudWatch Log Groups
data "aws_cloudwatch_log_groups" "eks" {
  log_group_name_prefix = "/aws/eks/${local.cluster_name}"
}

data "aws_cloudwatch_log_groups" "application" {
  log_group_name_prefix = "/appius/${var.environment}"
}

# ECR Repositories
data "aws_ecr_repository" "backend" {
  name = "appius-${var.environment}-backend"
}

data "aws_ecr_repository" "frontend" {
  name = "appius-${var.environment}-frontend"
}

# S3 Buckets
data "aws_s3_bucket" "logs" {
  bucket = "appius-${var.environment}-logs"
}

data "aws_s3_bucket" "artifacts" {
  bucket = "appius-${var.environment}-artifacts"
}

# Current AWS Account
data "aws_canonical_user_id" "current" {}

# AWS Partition (aws, aws-cn, aws-us-gov)
data "aws_partition" "current" {}

# AWS Service Principal
data "aws_iam_policy_document" "service_principal" {
  statement {
    effect = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = [
        "eks.amazonaws.com",
        "ec2.amazonaws.com",
        "elasticache.amazonaws.com",
        "rds.amazonaws.com",
        "s3.amazonaws.com"
      ]
    }
  }
}

# Secrets Manager
data "aws_secretsmanager_secret" "rds" {
  name = "appius/${var.environment}/rds"
}

data "aws_secretsmanager_secret" "redis" {
  name = "appius/${var.environment}/redis"
}

# WAF IPSets
data "aws_wafv2_ip_set" "allowed" {
  name  = "appius-${var.environment}-allowed-ips"
  scope = "REGIONAL"
}

data "aws_wafv2_ip_set" "blocked" {
  name  = "appius-${var.environment}-blocked-ips"
  scope = "REGIONAL"
}

# CloudFront
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "s3" {
  name = "Managed-CORS-S3Origin"
}

# Systems Manager Parameters
data "aws_ssm_parameters_by_path" "config" {
  path = "/appius/${var.environment}/"
}

# IAM Account Password Policy
data "aws_iam_account_password_policy" "current" {}
