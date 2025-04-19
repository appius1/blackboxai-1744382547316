# Backend configuration for storing Terraform state
terraform {
  backend "s3" {
    bucket         = "appius-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "appius-terraform-locks"
  }
}

# S3 bucket for storing Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "appius-terraform-state"

  # Prevent accidental deletion of this S3 bucket
  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning for state files
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption by default
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for Terraform state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "appius-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Prevent accidental deletion of this DynamoDB table
  lifecycle {
    prevent_destroy = true
  }
}

# IAM policy for Terraform state management
resource "aws_iam_policy" "terraform_state" {
  name        = "terraform-state-management"
  description = "Policy for managing Terraform state"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      }
    ]
  })
}

# Outputs for backend configuration
output "terraform_state_bucket" {
  value       = aws_s3_bucket.terraform_state.id
  description = "The name of the S3 bucket storing Terraform state"
}

output "terraform_state_lock_table" {
  value       = aws_dynamodb_table.terraform_locks.name
  description = "The name of the DynamoDB table for Terraform state locking"
}

# Backend configuration for different environments
locals {
  backend_configs = {
    dev = {
      key     = "dev/terraform.tfstate"
      profile = "appius-dev"
    }
    staging = {
      key     = "staging/terraform.tfstate"
      profile = "appius-staging"
    }
    prod = {
      key     = "prod/terraform.tfstate"
      profile = "appius-prod"
    }
  }
}

# Note: To use a specific environment's backend configuration:
# terraform init \
#   -backend-config="key=${local.backend_configs[env].key}" \
#   -backend-config="profile=${local.backend_configs[env].profile}"

# Additional backend settings
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_logging" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.terraform_state.id
  target_prefix = "log/"
}

# CloudWatch alarms for monitoring state access
resource "aws_cloudwatch_metric_alarm" "terraform_state_access" {
  alarm_name          = "terraform-state-access"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfObjects"
  namespace           = "AWS/S3"
  period             = "300"
  statistic          = "Average"
  threshold          = "1000"
  alarm_description  = "This metric monitors access to Terraform state"

  dimensions = {
    BucketName = aws_s3_bucket.terraform_state.id
  }
}
