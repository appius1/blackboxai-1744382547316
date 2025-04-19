# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "appius-${var.environment}-vpc"
  cidr = local.vpc_cidr_block

  azs             = var.availability_zones
  private_subnets = local.private_subnet_cidrs
  public_subnets  = local.public_subnet_cidrs

  enable_nat_gateway     = local.network_config.enable_nat_gateway
  single_nat_gateway     = local.network_config.single_nat_gateway
  enable_vpn_gateway     = local.network_config.enable_vpn_gateway
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # Tags required for EKS
  private_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"             = "1"
  }

  public_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                      = "1"
  }

  tags = local.common_tags
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "appius-${var.environment}-alb"
  description = "Security group for application load balancer"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "appius-${var.environment}-alb"
    }
  )
}

resource "aws_security_group" "eks_worker" {
  name_prefix = "appius-${var.environment}-eks-worker"
  description = "Security group for EKS worker nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "appius-${var.environment}-eks-worker"
    }
  )
}

# Route53 Configuration
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = local.common_tags
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.alb.lb_dns_name
    zone_id               = module.alb.lb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.cloudfront.domain_name
    zone_id               = module.cloudfront.hosted_zone_id
    evaluate_target_health = false
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  provider                  = aws.us-east-1
  domain_name              = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method        = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us-east-1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# DNS Validation Records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Application Load Balancer
module "alb" {
  source = "terraform-aws-modules/alb/aws"

  name               = "appius-${var.environment}"
  load_balancer_type = "application"
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.public_subnets
  security_groups    = [aws_security_group.alb.id]

  target_groups = [
    {
      name             = "appius-${var.environment}-api"
      backend_protocol = "HTTP"
      backend_port     = 80
      target_type      = "ip"
      health_check = {
        enabled             = true
        interval           = 30
        path               = "/health"
        port               = "traffic-port"
        healthy_threshold  = 3
        unhealthy_threshold = 3
        timeout            = 6
        protocol          = "HTTP"
        matcher           = "200-399"
      }
    }
  ]

  https_listeners = [
    {
      port               = 443
      protocol          = "HTTPS"
      certificate_arn   = aws_acm_certificate.main.arn
      target_group_index = 0
    }
  ]

  http_tcp_listeners = [
    {
      port        = 80
      protocol    = "HTTP"
      action_type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  ]

  tags = local.common_tags
}

# WAF Configuration
resource "aws_wafv2_web_acl" "main" {
  name        = "appius-${var.environment}"
  description = "WAF rules for Appius application"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "AppiumWAFMetric"
    sampled_requests_enabled  = true
  }

  tags = local.common_tags
}
