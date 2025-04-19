#!/bin/bash

# Terraform Environment Cleanup Script

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

# Function to confirm action
confirm() {
    local message=$1
    local proceed
    
    echo -e "${YELLOW}${message}${NC}"
    read -p "Are you sure you want to proceed? (y/N) " proceed
    
    if [[ ! $proceed =~ ^[Yy]$ ]]; then
        error "Operation cancelled by user"
    fi
}

# Function to validate environment
validate_environment() {
    local env=$1
    local valid_envs=("dev" "staging" "prod")
    
    if [[ ! " ${valid_envs[@]} " =~ " ${env} " ]]; then
        error "Invalid environment: $env. Must be one of: ${valid_envs[*]}"
    fi
    
    if [[ "$env" == "prod" ]]; then
        confirm "You are attempting to cleanup the PRODUCTION environment. This is a destructive action!"
    fi
}

# Function to check if resources exist
check_resources() {
    local env=$1
    
    echo "Checking for existing resources..."
    
    # Check S3 bucket
    if aws s3 ls "s3://appius-terraform-state-${env}" 2>&1 > /dev/null; then
        warn "Found state bucket: appius-terraform-state-${env}"
    fi
    
    # Check DynamoDB table
    if aws dynamodb describe-table --table-name "appius-terraform-locks-${env}" 2>&1 > /dev/null; then
        warn "Found lock table: appius-terraform-locks-${env}"
    fi
    
    # Check SSM parameters
    if aws ssm get-parameters-by-path --path "/appius/${env}" 2>&1 > /dev/null; then
        warn "Found SSM parameters under /appius/${env}"
    fi
}

# Function to cleanup Terraform state
cleanup_terraform_state() {
    local env=$1
    
    echo "Cleaning up Terraform state..."
    
    # Select workspace
    if terraform workspace select "${env}" 2>/dev/null; then
        # Destroy resources
        terraform destroy \
            -var-file="environments/${env}.tfvars" \
            -auto-approve \
            || warn "Failed to destroy some resources. Manual cleanup may be required."
        
        # Delete workspace
        terraform workspace select default
        terraform workspace delete "${env}" \
            || warn "Failed to delete workspace: ${env}"
    else
        warn "Workspace ${env} not found"
    fi
}

# Function to cleanup S3 bucket
cleanup_s3_bucket() {
    local env=$1
    local bucket_name="appius-terraform-state-${env}"
    
    echo "Cleaning up S3 bucket..."
    
    if aws s3 ls "s3://${bucket_name}" 2>&1 > /dev/null; then
        # Empty bucket first
        aws s3 rm "s3://${bucket_name}" --recursive
        
        # Delete bucket
        aws s3api delete-bucket \
            --bucket "${bucket_name}" \
            || warn "Failed to delete bucket: ${bucket_name}"
    else
        warn "Bucket ${bucket_name} not found"
    fi
}

# Function to cleanup DynamoDB table
cleanup_dynamodb_table() {
    local env=$1
    local table_name="appius-terraform-locks-${env}"
    
    echo "Cleaning up DynamoDB table..."
    
    if aws dynamodb describe-table --table-name "${table_name}" 2>&1 > /dev/null; then
        aws dynamodb delete-table \
            --table-name "${table_name}" \
            || warn "Failed to delete table: ${table_name}"
        
        # Wait for table deletion
        aws dynamodb wait table-not-exists --table-name "${table_name}"
    else
        warn "Table ${table_name} not found"
    fi
}

# Function to cleanup SSM parameters
cleanup_ssm_parameters() {
    local env=$1
    
    echo "Cleaning up SSM parameters..."
    
    # Get all parameters under the environment path
    local parameters=$(aws ssm get-parameters-by-path \
        --path "/appius/${env}" \
        --recursive \
        --query "Parameters[*].Name" \
        --output text)
    
    if [[ -n "${parameters}" ]]; then
        for param in ${parameters}; do
            aws ssm delete-parameter \
                --name "${param}" \
                || warn "Failed to delete parameter: ${param}"
        done
    else
        warn "No SSM parameters found for environment: ${env}"
    fi
}

# Function to cleanup ECR repositories
cleanup_ecr_repositories() {
    local env=$1
    
    echo "Cleaning up ECR repositories..."
    
    local repos=("backend" "frontend")
    
    for repo in "${repos[@]}"; do
        local repo_name="appius-${env}-${repo}"
        
        if aws ecr describe-repositories --repository-names "${repo_name}" 2>&1 > /dev/null; then
            # Delete all images in repository
            aws ecr delete-repository \
                --repository-name "${repo_name}" \
                --force \
                || warn "Failed to delete repository: ${repo_name}"
        else
            warn "Repository ${repo_name} not found"
        fi
    done
}

# Function to cleanup CloudWatch log groups
cleanup_cloudwatch_logs() {
    local env=$1
    
    echo "Cleaning up CloudWatch log groups..."
    
    # Delete log groups with environment prefix
    aws logs describe-log-groups \
        --log-group-name-prefix "/appius/${env}" \
        --query 'logGroups[*].logGroupName' \
        --output text \
        | tr '\t' '\n' \
        | while read -r log_group; do
            aws logs delete-log-group \
                --log-group-name "${log_group}" \
                || warn "Failed to delete log group: ${log_group}"
        done
}

# Main cleanup function
main() {
    local env=$1
    
    if [[ -z "${env}" ]]; then
        error "Environment name not provided. Usage: $0 <environment>"
    fi
    
    echo "Starting cleanup for environment: ${env}"
    echo "-------------------------"
    
    validate_environment "${env}"
    check_resources "${env}"
    
    confirm "This will destroy all resources and cleanup state for environment: ${env}"
    
    cleanup_terraform_state "${env}"
    cleanup_s3_bucket "${env}"
    cleanup_dynamodb_table "${env}"
    cleanup_ssm_parameters "${env}"
    cleanup_ecr_repositories "${env}"
    cleanup_cloudwatch_logs "${env}"
    
    echo "-------------------------"
    success "Environment cleanup completed"
    echo
    echo "Note: Some resources might require manual verification and cleanup."
    echo "Please check the AWS Console to ensure all resources have been properly removed."
}

# Execute cleanup
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
