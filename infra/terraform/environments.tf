# Environment-specific configurations
locals {
  environments = {
    dev = {
      domain_prefix = "dev"
      vpc_cidr     = "10.1.0.0/16"
      instance_types = {
        eks    = "t3.small"
        rds    = "db.t3.small"
        redis  = "cache.t3.micro"
      }
      high_availability = false
      monitoring = {
        retention_days = 7
        detailed_monitoring = false
      }
      backup = {
        retention_days = 7
        frequency     = "daily"
      }
    }
    staging = {
      domain_prefix = "staging"
      vpc_cidr     = "10.2.0.0/16"
      instance_types = {
        eks    = "t3.medium"
        rds    = "db.t3.medium"
        redis  = "cache.t3.small"
      }
      high_availability = true
      monitoring = {
        retention_days = 14
        detailed_monitoring = true
      }
      backup = {
        retention_days = 14
        frequency     = "daily"
      }
    }
    prod = {
      domain_prefix = ""  # No prefix for production
      vpc_cidr     = "10.0.0.0/16"
      instance_types = {
        eks    = "t3.large"
        rds    = "db.t3.large"
        redis  = "cache.t3.medium"
      }
      high_availability = true
      monitoring = {
        retention_days = 30
        detailed_monitoring = true
      }
      backup = {
        retention_days = 30
        frequency     = "hourly"
      }
    }
  }

  # Current environment configuration
  env_config = local.environments[var.environment]

  # Environment-specific domain name
  domain_name = local.env_config.domain_prefix != "" ? "${local.env_config.domain_prefix}.${var.domain_name}" : var.domain_name

  # Environment-specific scaling configuration
  scaling_config = {
    min_size     = local.env_config.high_availability ? 2 : 1
    max_size     = local.env_config.high_availability ? 10 : 3
    desired_size = local.env_config.high_availability ? 3 : 1
  }

  # Environment-specific backup configuration
  backup_config = {
    retention_period = local.env_config.backup.retention_days
    backup_window    = "03:00-04:00"
    backup_frequency = local.env_config.backup.frequency
  }

  # Environment-specific monitoring configuration
  monitoring_config = {
    retention_days     = local.env_config.monitoring.retention_days
    detailed_monitoring = local.env_config.monitoring.detailed_monitoring
    alarm_thresholds = {
      cpu_utilization    = local.env_config.high_availability ? 70 : 80
      memory_utilization = local.env_config.high_availability ? 70 : 80
      disk_utilization   = 85
      error_rate        = local.env_config.high_availability ? 1 : 5
    }
  }

  # Environment-specific security configuration
  security_config = {
    deletion_protection = local.env_config.high_availability
    ssl_policy         = local.env_config.high_availability ? "ELBSecurityPolicy-TLS-1-2-2017-01" : "ELBSecurityPolicy-2016-08"
    waf_rule_priority = {
      rate_limit = local.env_config.high_availability ? 100 : 1000
      ip_reputation = 200
      sql_injection = 300
    }
  }

  # Environment-specific networking configuration
  networking_config = {
    vpc_cidr           = local.env_config.vpc_cidr
    nat_gateway_count  = local.env_config.high_availability ? 3 : 1
    availability_zones = local.env_config.high_availability ? 3 : 2
  }

  # Environment-specific tags
  environment_tags = {
    Environment     = var.environment
    HighAvailability = local.env_config.high_availability
    BackupRetention = local.env_config.backup.retention_days
    MonitoringLevel = local.env_config.monitoring.detailed_monitoring ? "Detailed" : "Basic"
  }
}

# Environment-specific Route53 records
resource "aws_route53_record" "environment" {
  count = local.env_config.domain_prefix != "" ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain_name
  type    = "A"

  alias {
    name                   = module.alb.lb_dns_name
    zone_id               = module.alb.lb_zone_id
    evaluate_target_health = true
  }
}

# Environment-specific WAF rules
resource "aws_wafv2_web_acl" "environment" {
  name        = "appius-${var.environment}"
  description = "WAF rules for ${var.environment} environment"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimit"
    priority = local.security_config.waf_rule_priority.rate_limit

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.environment == "prod" ? 2000 : 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRule"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "WAFWebACL"
    sampled_requests_enabled  = true
  }

  tags = merge(
    local.common_tags,
    local.environment_tags
  )
}

# Environment-specific CloudWatch dashboards
resource "aws_cloudwatch_dashboard" "environment" {
  dashboard_name = "Appius-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", local.cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", module.db.db_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS CPU Utilization"
        }
      }
    ]
  })
}
