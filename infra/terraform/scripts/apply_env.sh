#!/bin/bash

# Terraform Environment Apply Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Function to print info
info() {
    echo -e "${BLUE}INFO: $1${NC}"
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
        confirm "You are about to apply changes to the PRODUCTION environment!"
    fi
}

# Function to check for existing plan
check_plan() {
    local plan_file=$1
    
    if [[ ! -f "${plan_file}" ]]; then
        error "Plan file not found: ${plan_file}"
    fi
    
    # Check plan age
    local plan_age=$(( $(date +%s) - $(stat -c %Y "${plan_file}") ))
    local max_age=3600 # 1 hour
    
    if [[ ${plan_age} -gt ${max_age} ]]; then
        error "Plan is too old (${plan_age} seconds). Please generate a new plan."
    fi
}

# Function to validate plan contents
validate_plan() {
    local plan_file=$1
    local env=$2
    
    echo "Validating plan..."
    
    # Check that plan matches environment
    local plan_env=$(terraform show -json "${plan_file}" | jq -r '.variables.environment.value')
    if [[ "${plan_env}" != "${env}" ]]; then
        error "Plan environment (${plan_env}) does not match target environment (${env})"
    }
    
    # Show plan summary
    terraform show "${plan_file}"
    
    # Confirm changes
    confirm "Review the plan above. Do you want to apply these changes?"
}

# Function to create apply log directory
create_apply_directory() {
    local env=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local apply_dir="applies/${env}/${timestamp}"
    
    mkdir -p "${apply_dir}"
    echo "${apply_dir}"
}

# Function to save apply metadata
save_apply_metadata() {
    local apply_dir=$1
    local env=$2
    local plan_file=$3
    
    cat > "${apply_dir}/metadata.json" << EOF
{
    "environment": "${env}",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
    "terraform_version": "$(terraform version -json | jq -r '.terraform_version')",
    "user": "$(whoami)",
    "hostname": "$(hostname)",
    "plan_file": "${plan_file}"
}
EOF
}

# Function to backup state
backup_state() {
    local env=$1
    local apply_dir=$2
    
    echo "Backing up Terraform state..."
    terraform state pull > "${apply_dir}/terraform.tfstate.backup"
}

# Function to verify resources
verify_resources() {
    local env=$1
    
    echo "Verifying resources..."
    
    # Verify key resources based on environment
    case "${env}" in
        "prod")
            verify_production_resources
            ;;
        "staging")
            verify_staging_resources
            ;;
        "dev")
            verify_dev_resources
            ;;
    esac
}

# Function to verify production resources
verify_production_resources() {
    # Add specific production verification steps
    info "Verifying production resources..."
    
    # Example verifications:
    # - Check high availability
    # - Verify backup configurations
    # - Check security groups
    # - Verify monitoring
}

# Function to verify staging resources
verify_staging_resources() {
    # Add specific staging verification steps
    info "Verifying staging resources..."
}

# Function to verify dev resources
verify_dev_resources() {
    # Add specific dev verification steps
    info "Verifying development resources..."
}

# Function to apply changes
apply_changes() {
    local plan_file=$1
    local apply_dir=$2
    
    echo "Applying changes..."
    
    # Apply the plan and save output
    if terraform apply -input=false "${plan_file}" 2>&1 | tee "${apply_dir}/apply.log"; then
        success "Changes applied successfully"
    else
        error "Failed to apply changes. Check ${apply_dir}/apply.log for details"
    fi
}

# Function to run post-apply verifications
post_apply_verify() {
    local env=$1
    
    echo "Running post-apply verifications..."
    
    # Verify state
    terraform state pull > /dev/null || error "Failed to pull state after apply"
    
    # Run terraform plan to verify no changes
    if terraform plan -detailed-exitcode -var-file="environments/${env}.tfvars" > /dev/null; then
        success "No changes detected after apply"
    else
        warn "Unexpected changes detected after apply"
    fi
}

# Main function
main() {
    local env=$1
    local plan_file=$2
    
    if [[ -z "${env}" ]] || [[ -z "${plan_file}" ]]; then
        error "Usage: $0 <environment> <plan-file>"
    fi
    
    validate_environment "${env}"
    check_plan "${plan_file}"
    
    # Select workspace
    terraform workspace select "${env}" || error "Failed to select workspace: ${env}"
    
    # Create apply directory
    local apply_dir=$(create_apply_directory "${env}")
    info "Using apply directory: ${apply_dir}"
    
    # Validate and confirm plan
    validate_plan "${plan_file}" "${env}"
    
    # Save metadata and backup state
    save_apply_metadata "${apply_dir}" "${env}" "${plan_file}"
    backup_state "${env}" "${apply_dir}"
    
    # Apply changes
    apply_changes "${plan_file}" "${apply_dir}"
    
    # Verify resources
    verify_resources "${env}"
    post_apply_verify "${env}"
    
    success "Apply completed successfully"
    echo
    echo "Apply directory: ${apply_dir}"
    echo "Apply log: ${apply_dir}/apply.log"
    echo "State backup: ${apply_dir}/terraform.tfstate.backup"
}

# Execute apply
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
