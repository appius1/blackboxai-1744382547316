locals {
  # Common tags to be assigned to all resources
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = "appius"
      ManagedBy   = "terraform"
    }
  )

  # Determine if we're in a production environment
  is_production = var.environment == "prod"

  # EKS cluster name
  cluster_name = "appius-${var.environment}"

  # RDS instance name
  db_instance_name = "appius-${var.environment}"

  # Redis cluster name
  redis_cluster_name = "appius-${var.environment}"

  # S3 bucket name with environment
  storage_bucket_name = "appius-storage-${var.environment}"

  # Domain names
  domain_names = {
    main = var.domain_name
    api  = "api.${var.domain_name}"
    www  = "www.${var.domain_name}"
  }

  # CIDR blocks for security groups
  vpc_cidr_block = var.vpc_cidr
  
  # Subnet calculations
  subnet_count = length(var.availability_zones)
  
  # Calculate subnet sizes based on VPC CIDR
  subnet_newbits = ceil(log(local.subnet_count * 2, 2)) + 1
  
  private_subnet_cidrs = [
    for i in range(local.subnet_count) :
    cidrsubnet(local.vpc_cidr_block, local.subnet_newbits, i)
  ]
  
  public_subnet_cidrs = [
    for i in range(local.subnet_count) :
    cidrsubnet(local.vpc_cidr_block, local.subnet_newbits, i + local.subnet_count)
  ]

  # Resource sizing based on environment
  node_groups = {
    general = {
      desired_size = local.is_production ? var.eks_node_desired_size : 1
      min_size     = local.is_production ? var.eks_node_min_size : 1
      max_size     = local.is_production ? var.eks_node_max_size : 2
      instance_types = local.is_production ? var.eks_node_instance_types : ["t3.small"]
    }
  }

  rds_config = {
    instance_class    = local.is_production ? var.rds_instance_class : "db.t3.small"
    allocated_storage = local.is_production ? var.rds_allocated_storage : 10
    multi_az         = local.is_production
  }

  redis_config = {
    node_type        = local.is_production ? var.redis_node_type : "cache.t3.micro"
    num_cache_nodes  = local.is_production ? var.redis_num_cache_nodes : 1
    multi_az         = local.is_production
  }

  # Monitoring configuration
  monitoring_config = {
    enabled          = var.enable_monitoring
    retention_days   = var.monitoring_retention_days
    detailed_metrics = local.is_production
  }

  # Backup configuration
  backup_config = {
    retention_period = local.is_production ? var.backup_retention_period : 1
    backup_window    = "03:00-04:00"
    maintenance_window = "Mon:04:00-Mon:05:00"
  }

  # Network configuration
  network_config = {
    enable_nat_gateway = var.enable_nat_gateway
    single_nat_gateway = !local.is_production || var.single_nat_gateway
    enable_vpn_gateway = local.is_production
  }

  # Security configuration
  security_config = {
    deletion_protection = local.is_production && var.enable_deletion_protection
    encrypt_storage    = true
    enable_ssl         = true
  }

  # Cost estimation (monthly)
  cost_estimation = {
    eks = {
      control_plane = 73.00  # $73/month for EKS control plane
      nodes = local.is_production ? (140.16 * var.eks_node_desired_size) : 70.08  # $70.08/month per t3.medium
    }
    rds = {
      instance = local.is_production ? 50.96 : 25.48  # $50.96/month for db.t3.medium
      storage  = (local.rds_config.allocated_storage * 0.115)  # $0.115/GB-month for gp2
    }
    redis = {
      nodes = local.is_production ? (12.41 * var.redis_num_cache_nodes) : 12.41  # $12.41/month per cache.t3.micro
    }
    estimated_total = local.is_production ? 276.53 : 181.38  # Base estimation excluding data transfer and additional storage
  }

  # Feature flags
  features = {
    monitoring = local.is_production
    alerting   = local.is_production
    backups    = true
    ssl        = true
  }
}
