#!/bin/bash

# Environment Validation Script for Terraform Configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print error and exit
error() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

# Function to print warning
warn() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Function to print success
success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# Check required environment variables
check_env_vars() {
    local required_vars=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AWS_DEFAULT_REGION")
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    success "All required environment variables are set"
}

# Validate environment name
validate_environment() {
    local env=$1
    local valid_envs=("dev" "staging" "prod")
    
    if [[ ! " ${valid_envs[@]} " =~ " ${env} " ]]; then
        error "Invalid environment: $env. Must be one of: ${valid_envs[*]}"
    fi
    
    success "Environment name '$env' is valid"
}

# Check if tfvars file exists
check_tfvars() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    
    if [[ ! -f "$tfvars_file" ]]; then
        error "Environment file $tfvars_file not found"
    fi
    
    success "Environment file $tfvars_file exists"
}

# Validate required variables in tfvars
validate_tfvars() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    local required_vars=("environment" "aws_region" "domain_name" "vpc_cidr")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}\s*=" "$tfvars_file"; then
            error "Required variable '$var' not found in $tfvars_file"
        fi
    done
    
    success "All required variables present in $tfvars_file"
}

# Validate CIDR ranges
validate_cidrs() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    
    # Extract VPC CIDR
    local vpc_cidr=$(grep "^vpc_cidr" "$tfvars_file" | cut -d'"' -f2)
    
    # Validate VPC CIDR format
    if ! [[ $vpc_cidr =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        error "Invalid VPC CIDR format: $vpc_cidr"
    fi
    
    success "CIDR ranges are valid"
}

# Check workspace exists
check_workspace() {
    local env=$1
    
    if ! terraform workspace list | grep -q " ${env}$"; then
        warn "Workspace '$env' does not exist. Creating..."
        terraform workspace new "$env"
    fi
    
    success "Workspace '$env' is available"
}

# Validate backend configuration
validate_backend() {
    local env=$1
    
    if ! grep -q "backend \"s3\"" backend.tf; then
        error "S3 backend configuration not found in backend.tf"
    fi
    
    success "Backend configuration is valid"
}

# Main validation function
main() {
    local env=$1
    
    if [[ -z "$env" ]]; then
        error "Environment name not provided. Usage: $0 <environment>"
    fi
    
    echo "Validating environment: $env"
    echo "-------------------------"
    
    check_env_vars
    validate_environment "$env"
    check_tfvars "$env"
    validate_tfvars "$env"
    validate_cidrs "$env"
    check_workspace "$env"
    validate_backend
    
    echo "-------------------------"
    success "Environment validation completed successfully"
}

# Execute validation
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

# Additional validation functions for specific resources

validate_eks_config() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    
    # Validate node instance types
    if ! grep -q "^eks_node_instance_types" "$tfvars_file"; then
        error "EKS node instance types not configured"
    fi
    
    # Validate node counts
    local min_size=$(grep "^eks_node_min_size" "$tfvars_file" | tr -d ' ' | cut -d'=' -f2)
    local max_size=$(grep "^eks_node_max_size" "$tfvars_file" | tr -d ' ' | cut -d'=' -f2)
    local desired_size=$(grep "^eks_node_desired_size" "$tfvars_file" | tr -d ' ' | cut -d'=' -f2)
    
    if [[ $desired_size -lt $min_size ]] || [[ $desired_size -gt $max_size ]]; then
        error "Invalid EKS node counts: desired_size must be between min_size and max_size"
    fi
    
    success "EKS configuration is valid"
}

validate_rds_config() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    
    # Validate instance class
    if ! grep -q "^rds_instance_class" "$tfvars_file"; then
        error "RDS instance class not configured"
    fi
    
    # Validate storage configuration
    local storage_size=$(grep "^rds_allocated_storage" "$tfvars_file" | tr -d ' ' | cut -d'=' -f2)
    if [[ $storage_size -lt 20 ]]; then
        error "RDS allocated storage must be at least 20GB"
    fi
    
    success "RDS configuration is valid"
}

validate_monitoring_config() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    
    # Validate monitoring retention
    if ! grep -q "^monitoring_retention_days" "$tfvars_file"; then
        error "Monitoring retention period not configured"
    fi
    
    # Validate alert configuration
    if ! grep -q "^alert_email" "$tfvars_file"; then
        error "Alert email not configured"
    fi
    
    success "Monitoring configuration is valid"
}

# Execute all validations
validate_all() {
    local env=$1
    
    main "$env"
    validate_eks_config "$env"
    validate_rds_config "$env"
    validate_monitoring_config "$env"
    
    success "All validations completed successfully"
}
