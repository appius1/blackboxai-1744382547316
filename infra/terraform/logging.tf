# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  name              = "/appius/${var.environment}/application"
  retention_in_days = local.monitoring_config.retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/appius/${var.environment}/audit"
  retention_in_days = local.monitoring_config.retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = local.common_tags
}

# KMS Key for Log Encryption
resource "aws_kms_key" "logs" {
  description             = "KMS key for encrypting CloudWatch logs"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_kms_alias" "logs" {
  name          = "alias/appius-${var.environment}-logs"
  target_key_id = aws_kms_key.logs.key_id
}

# Kinesis Firehose for Log Archival
resource "aws_kinesis_firehose_delivery_stream" "logs_archive" {
  name        = "appius-${var.environment}-logs-archive"
  destination = "s3"

  s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.logs_archive.arn
    prefix     = "logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    buffer_size        = 5
    buffer_interval    = 300
    compression_format = "GZIP"

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "S3Delivery"
    }
  }

  tags = local.common_tags
}

# S3 Bucket for Log Archival
resource "aws_s3_bucket" "logs_archive" {
  bucket = "appius-${var.environment}-logs-archive"

  tags = local.common_tags
}

resource "aws_s3_bucket_lifecycle_configuration" "logs_archive" {
  bucket = aws_s3_bucket.logs_archive.id

  rule {
    id     = "archive-logs"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# IAM Role for Firehose
resource "aws_iam_role" "firehose" {
  name = "appius-${var.environment}-firehose"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for Firehose
resource "aws_iam_role_policy" "firehose" {
  name = "appius-${var.environment}-firehose"
  role = aws_iam_role.firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.logs_archive.arn,
          "${aws_s3_bucket.logs_archive.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.firehose.arn,
          "${aws_cloudwatch_log_group.firehose.arn}:log-stream:*"
        ]
      }
    ]
  })
}

# CloudWatch Log Group for Firehose
resource "aws_cloudwatch_log_group" "firehose" {
  name              = "/aws/firehose/appius-${var.environment}"
  retention_in_days = 7
  kms_key_id        = aws_kms_key.logs.arn

  tags = local.common_tags
}

# Log Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "error-count"
  pattern        = "[timestamp, requestid, level=ERROR, ...]"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "Appius/Logs"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "api_latency" {
  name           = "api-latency"
  pattern        = "[timestamp, requestid, latency, ...]"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name          = "APILatency"
    namespace     = "Appius/Logs"
    value         = "$latency"
  }
}

# CloudWatch Alarms for Logs
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "appius-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorCount"
  namespace           = "Appius/Logs"
  period             = "300"
  statistic          = "Sum"
  threshold          = "10"
  alarm_description  = "This metric monitors error rate in application logs"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# Log Insights Queries
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "Error Analysis"

  log_group_names = [aws_cloudwatch_log_group.application.name]

  query_string = <<EOF
fields @timestamp, @message
| filter level = "ERROR"
| stats count(*) as error_count by bin(30m)
| sort error_count desc
EOF
}

resource "aws_cloudwatch_query_definition" "api_latency_analysis" {
  name = "API Latency Analysis"

  log_group_names = [aws_cloudwatch_log_group.application.name]

  query_string = <<EOF
fields @timestamp, @message, latency
| stats avg(latency) as avg_latency, max(latency) as max_latency by bin(5m)
| sort avg_latency desc
EOF
}
