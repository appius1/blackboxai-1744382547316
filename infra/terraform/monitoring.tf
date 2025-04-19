# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${local.cluster_name}/cluster"
  retention_in_days = local.monitoring_config.retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/appius/${var.environment}/application"
  retention_in_days = local.monitoring_config.retention_days

  tags = local.common_tags
}

# CloudWatch Metrics
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "appius-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors EKS cluster CPU utilization"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = local.cluster_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "memory_utilization" {
  alarm_name          = "appius-${var.environment}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "memory_utilization"
  namespace           = "AWS/EKS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors EKS cluster memory utilization"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = local.cluster_name
  }

  tags = local.common_tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "appius-${var.environment}-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
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
            ["AWS/EKS", "CPUUtilization", "ClusterName", local.cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EKS CPU Utilization"
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
            ["AWS/EKS", "memory_utilization", "ClusterName", local.cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EKS Memory Utilization"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
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
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", module.redis.cluster_id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis CPU Utilization"
        }
      }
    ]
  })
}

# Container Insights
resource "aws_cloudwatch_log_group" "container_insights" {
  count             = local.monitoring_config.enabled ? 1 : 0
  name              = "/aws/containerinsights/${local.cluster_name}/performance"
  retention_in_days = local.monitoring_config.retention_days

  tags = local.common_tags
}

# Application Logs
resource "aws_cloudwatch_log_group" "application_logs" {
  count             = local.monitoring_config.enabled ? 1 : 0
  name              = "/aws/appius/${var.environment}/application-logs"
  retention_in_days = local.monitoring_config.retention_days

  tags = local.common_tags
}

# Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_logs" {
  count          = local.monitoring_config.enabled ? 1 : 0
  name           = "error-logs"
  pattern        = "ERROR"
  log_group_name = aws_cloudwatch_log_group.application_logs[0].name

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "Appius/Application"
    value         = "1"
    default_value = "0"
  }
}

# Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  count               = local.monitoring_config.enabled ? 1 : 0
  alarm_name          = "appius-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorCount"
  namespace           = "Appius/Application"
  period             = "300"
  statistic          = "Sum"
  threshold          = "10"
  alarm_description  = "This metric monitors application error rate"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# API Latency Monitoring
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  count               = local.monitoring_config.enabled ? 1 : 0
  alarm_name          = "appius-${var.environment}-high-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period             = "300"
  statistic          = "Average"
  threshold          = "1000"
  alarm_description  = "This metric monitors API Gateway latency"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = "appius-api"
    Stage   = var.environment
  }

  tags = local.common_tags
}
