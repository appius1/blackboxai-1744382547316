#!/bin/bash

# Terraform Environment Initialization Script

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

# Function to check prerequisites
check_prerequisites() {
    local required_commands=("terraform" "aws" "jq")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is required but not installed"
        fi
    done
    
    success "All prerequisites are installed"
}

# Function to validate AWS credentials
validate_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        error "Invalid AWS credentials or no AWS credentials found"
    fi
    
    success "AWS credentials are valid"
}

# Function to create S3 bucket for Terraform state
create_state_bucket() {
    local env=$1
    local bucket_name="appius-terraform-state-${env}"
    local region="us-west-2"
    
    if ! aws s3 ls "s3://${bucket_name}" 2>&1 > /dev/null; then
        echo "Creating S3 bucket for Terraform state..."
        aws s3api create-bucket \
            --bucket "${bucket_name}" \
            --region "${region}" \
            --create-bucket-configuration LocationConstraint="${region}"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "${bucket_name}" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "${bucket_name}" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        # Block public access
        aws s3api put-public-access-block \
            --bucket "${bucket_name}" \
            --public-access-block-configuration '{
                "BlockPublicAcls": true,
                "IgnorePublicAcls": true,
                "BlockPublicPolicy": true,
                "RestrictPublicBuckets": true
            }'
    else
        warn "State bucket ${bucket_name} already exists"
    fi
    
    success "State bucket configuration complete"
}

# Function to create DynamoDB table for state locking
create_lock_table() {
    local env=$1
    local table_name="appius-terraform-locks-${env}"
    local region="us-west-2"
    
    if ! aws dynamodb describe-table --table-name "${table_name}" 2>&1 > /dev/null; then
        echo "Creating DynamoDB table for state locking..."
        aws dynamodb create-table \
            --table-name "${table_name}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "${region}"
            
        # Wait for table to be created
        aws dynamodb wait table-exists --table-name "${table_name}"
    else
        warn "Lock table ${table_name} already exists"
    fi
    
    success "Lock table configuration complete"
}

# Function to initialize Terraform workspace
init_terraform() {
    local env=$1
    
    # Initialize Terraform
    echo "Initializing Terraform..."
    terraform init \
        -backend-config="bucket=appius-terraform-state-${env}" \
        -backend-config="key=terraform.tfstate" \
        -backend-config="region=us-west-2" \
        -backend-config="dynamodb_table=appius-terraform-locks-${env}"
    
    # Create and select workspace
    if ! terraform workspace select "${env}" 2>/dev/null; then
        echo "Creating new workspace: ${env}"
        terraform workspace new "${env}"
    fi
    
    success "Terraform initialization complete"
}

# Function to create SSM parameters
create_ssm_parameters() {
    local env=$1
    local region="us-west-2"
    
    echo "Creating SSM parameters..."
    
    # Create parameters with dummy values (to be updated later)
    local parameters=(
        "/appius/${env}/database/username"
        "/appius/${env}/database/password"
        "/appius/${env}/redis/auth-token"
        "/appius/${env}/jwt/secret"
        "/appius/${env}/stripe/api-key"
        "/appius/${env}/cloudflare/api-token"
    )
    
    for param in "${parameters[@]}"; do
        aws ssm put-parameter \
            --name "${param}" \
            --value "dummy-value-change-me" \
            --type SecureString \
            --overwrite \
            --region "${region}" \
            || warn "Failed to create parameter: ${param}"
    done
    
    success "SSM parameters created"
}

# Function to validate environment configuration
validate_config() {
    local env=$1
    local config_file="environments/${env}.tfvars"
    
    if [[ ! -f "${config_file}" ]]; then
        error "Configuration file not found: ${config_file}"
    fi
    
    # Run the validation script
    ./validate_env.sh "${env}" || error "Environment validation failed"
    
    success "Environment configuration is valid"
}

# Main function
main() {
    local env=$1
    
    if [[ -z "${env}" ]]; then
        error "Environment name not provided. Usage: $0 <environment>"
    fi
    
    echo "Initializing environment: ${env}"
    echo "-------------------------"
    
    check_prerequisites
    validate_aws_credentials
    validate_config "${env}"
    create_state_bucket "${env}"
    create_lock_table "${env}"
    create_ssm_parameters "${env}"
    init_terraform "${env}"
    
    echo "-------------------------"
    success "Environment initialization completed successfully"
    echo
    echo "Next steps:"
    echo "1. Update SSM parameters with real values"
    echo "2. Review and update ${env}.tfvars as needed"
    echo "3. Run 'terraform plan' to verify configuration"
}

# Execute initialization
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
