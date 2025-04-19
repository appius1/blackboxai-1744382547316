# RDS Instance
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 5.0"

  identifier = local.db_instance_name

  engine               = "postgres"
  engine_version      = "14"
  family              = "postgres14"
  major_engine_version = "14"
  instance_class      = local.rds_config.instance_class

  allocated_storage     = local.rds_config.allocated_storage
  max_allocated_storage = local.rds_config.allocated_storage * 2

  db_name  = "appius"
  username = var.db_username
  port     = 5432

  multi_az               = local.rds_config.multi_az
  db_subnet_group_name   = module.vpc.database_subnet_group
  vpc_security_group_ids = [aws_security_group.rds.id]

  maintenance_window              = local.backup_config.maintenance_window
  backup_window                  = local.backup_config.backup_window
  backup_retention_period        = local.backup_config.retention_period
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  performance_insights_enabled          = local.is_production
  performance_insights_retention_period = local.is_production ? 7 : 0

  deletion_protection = local.security_config.deletion_protection
  skip_final_snapshot = !local.is_production

  tags = local.common_tags
}

# Redis Cluster
module "redis" {
  source = "terraform-aws-modules/elasticache/aws"

  cluster_id           = local.redis_cluster_name
  engine              = "redis"
  engine_version      = "6.x"
  node_type           = local.redis_config.node_type
  num_cache_nodes     = local.redis_config.num_cache_nodes
  port                = 6379

  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  maintenance_window   = local.backup_config.maintenance_window
  snapshot_window     = local.backup_config.backup_window
  snapshot_retention_limit = local.backup_config.retention_period

  automatic_failover_enabled = local.redis_config.multi_az
  multi_az_enabled         = local.redis_config.multi_az

  at_rest_encryption_enabled = local.security_config.encrypt_storage
  transit_encryption_enabled = local.security_config.enable_ssl

  apply_immediately = !local.is_production

  tags = local.common_tags
}

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "appius-${var.environment}-redis"
  subnet_ids = module.vpc.private_subnets

  tags = local.common_tags
}

# Security Groups
resource "aws_security_group" "rds" {
  name_prefix = "appius-${var.environment}-rds"
  description = "Security group for RDS instance"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "appius-${var.environment}-rds"
    }
  )
}

resource "aws_security_group" "redis" {
  name_prefix = "appius-${var.environment}-redis"
  description = "Security group for Redis cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "appius-${var.environment}-redis"
    }
  )
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "appius-${var.environment}-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = module.db.db_instance_id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "appius-${var.environment}-redis-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors Redis CPU utilization"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = module.redis.cluster_id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_memory" {
  alarm_name          = "appius-${var.environment}-rds-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "1000000000" # 1GB in bytes
  alarm_description  = "This metric monitors RDS freeable memory"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = module.db.db_instance_id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "appius-${var.environment}-redis-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors Redis memory usage"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = module.redis.cluster_id
  }

  tags = local.common_tags
}

# Parameter Groups
resource "aws_db_parameter_group" "postgres" {
  name_prefix = "appius-${var.environment}-postgres"
  family      = "postgres14"

  parameter {
    name  = "log_min_duration_statement"
    value = local.is_production ? "1000" : "0"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = local.common_tags
}

resource "aws_elasticache_parameter_group" "redis" {
  family = "redis6.x"
  name   = "appius-${var.environment}-redis"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = local.common_tags
}
