# Terraform Infrastructure Documentation

This directory contains the Terraform configurations for managing the Appius infrastructure across different environments.

## Architecture Overview

The infrastructure is designed with a multi-environment, multi-tier architecture:

- **Networking**: VPC with public and private subnets across multiple availability zones
- **Compute**: EKS cluster for container orchestration
- **Storage**: RDS for databases, ElastiCache for caching, S3 for object storage
- **Security**: WAF, Security Groups, KMS for encryption
- **Monitoring**: CloudWatch, Prometheus, Grafana
- **CI/CD**: CodeBuild, ECR

## Directory Structure

```
terraform/
├── main.tf              # Main infrastructure configuration
├── variables.tf         # Input variables
├── outputs.tf          # Output values
├── providers.tf        # Provider configurations
├── versions.tf         # Version constraints
├── locals.tf           # Local variables
├── data.tf            # Data source definitions
├── backend.tf         # Backend configuration
├── environments.tf    # Environment-specific configurations
├── networking.tf      # VPC and networking resources
├── security.tf        # IAM and security resources
├── database.tf        # RDS and ElastiCache resources
├── storage.tf         # S3 and persistent storage
├── monitoring.tf      # Monitoring and logging
├── logging.tf         # Logging configuration
├── cicd.tf           # CI/CD resources
└── workspaces.tf      # Terraform workspace configurations
```

## Prerequisites

- Terraform >= 1.0.0
- AWS CLI configured with appropriate credentials
- kubectl installed for Kubernetes operations
- helm installed for Kubernetes package management

## Environment Variables

Required environment variables:

```bash
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_DEFAULT_REGION="us-west-2"
```

## Usage

### Initialize Terraform

```bash
# Initialize Terraform with backend configuration
terraform init \
  -backend-config="bucket=appius-terraform-state-${ENV}" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=us-west-2"
```

### Select Workspace

```bash
# Create and switch to a new workspace
terraform workspace new ${ENV}

# Or select an existing workspace
terraform workspace select ${ENV}
```

### Plan and Apply

```bash
# Plan changes
terraform plan -var-file="environments/${ENV}.tfvars" -out=plan.tfplan

# Apply changes
terraform apply plan.tfplan
```

### Destroy Infrastructure

```bash
# Destroy resources (use with caution)
terraform destroy -var-file="environments/${ENV}.tfvars"
```

## Environments

### Development (dev)
- Minimal resources for development and testing
- Less redundancy and smaller instance types
- Faster deployment cycles

### Staging
- Mirror of production with reduced capacity
- Used for testing and validation
- Moderate redundancy and instance types

### Production (prod)
- Full high-availability configuration
- Maximum redundancy and optimal instance types
- Strict security controls

## Security

### Encryption
- All data at rest is encrypted using KMS
- TLS for all in-transit communication
- Secrets managed through AWS Secrets Manager

### Network Security
- VPC with private subnets for sensitive resources
- WAF rules for API protection
- Security groups for fine-grained access control

### Access Control
- IAM roles and policies for least privilege access
- RBAC for Kubernetes resources
- Multi-factor authentication enabled

## Monitoring and Logging

### Metrics
- CloudWatch metrics for AWS services
- Prometheus for Kubernetes monitoring
- Custom metrics for application monitoring

### Logging
- CloudWatch Logs for centralized logging
- ELK stack for log aggregation and analysis
- Audit logging for security events

### Alerts
- CloudWatch Alarms for infrastructure alerts
- PagerDuty integration for incident management
- Custom alert thresholds per environment

## Backup and Recovery

### Backup Strategy
- Automated daily backups for all databases
- S3 versioning for object storage
- Snapshot retention policies per environment

### Disaster Recovery
- Multi-AZ deployments for high availability
- Cross-region replication for critical data
- Documented recovery procedures

## Cost Management

### Resource Optimization
- Auto-scaling policies for dynamic workloads
- Instance right-sizing recommendations
- Cost allocation tags for billing

### Cost Controls
- Budget alerts and thresholds
- Reserved instances for predictable workloads
- Spot instances for flexible workloads

## Best Practices

### Infrastructure as Code
- All changes through version-controlled Terraform
- Modular and reusable configurations
- Consistent naming conventions

### Change Management
- Terraform plan review required
- Changes applied through CI/CD pipeline
- Environment promotion workflow

### Documentation
- Infrastructure documentation in code
- Runbooks for common operations
- Architecture decision records

## Troubleshooting

### Common Issues
1. Backend initialization failures
   - Check AWS credentials
   - Verify S3 bucket permissions

2. Apply failures
   - Review error messages
   - Check resource dependencies
   - Verify quota limits

3. State management issues
   - Use workspace commands
   - Check state file locking
   - Review backend configuration

## Contributing

1. Create a new branch for changes
2. Follow coding standards and naming conventions
3. Include documentation updates
4. Submit pull request for review

## Support

For issues or questions:
- Create GitHub issue
- Contact DevOps team
- Review runbooks and documentation
