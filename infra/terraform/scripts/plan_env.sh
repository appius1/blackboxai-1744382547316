#!/bin/bash

# Terraform Environment Plan Script

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

# Function to validate environment
validate_environment() {
    local env=$1
    local valid_envs=("dev" "staging" "prod")
    
    if [[ ! " ${valid_envs[@]} " =~ " ${env} " ]]; then
        error "Invalid environment: $env. Must be one of: ${valid_envs[*]}"
    fi
}

# Function to create plan directory
create_plan_directory() {
    local env=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local plan_dir="plans/${env}/${timestamp}"
    
    mkdir -p "${plan_dir}"
    echo "${plan_dir}"
}

# Function to generate plan summary
generate_plan_summary() {
    local plan_file=$1
    local summary_file=$2
    
    echo "Plan Summary" > "${summary_file}"
    echo "============" >> "${summary_file}"
    echo "" >> "${summary_file}"
    echo "Generated: $(date)" >> "${summary_file}"
    echo "Environment: ${env}" >> "${summary_file}"
    echo "" >> "${summary_file}"
    
    # Extract resource changes
    echo "Resource Changes" >> "${summary_file}"
    echo "----------------" >> "${summary_file}"
    terraform show -no-color "${plan_file}" | grep -E '^\s*[~+-]' >> "${summary_file}"
    
    echo "" >> "${summary_file}"
    
    # Extract costs if available
    if terraform show -json "${plan_file}" | jq -e '.resource_changes[].change.actions' > /dev/null; then
        echo "Cost Changes (if available)" >> "${summary_file}"
        echo "-------------------------" >> "${summary_file}"
        terraform show -json "${plan_file}" | jq -r '.resource_changes[] | select(.change.actions[0] != "no-op")' >> "${summary_file}"
    fi
}

# Function to save plan metadata
save_plan_metadata() {
    local plan_dir=$1
    local env=$2
    
    cat > "${plan_dir}/metadata.json" << EOF
{
    "environment": "${env}",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
    "terraform_version": "$(terraform version -json | jq -r '.terraform_version')",
    "user": "$(whoami)",
    "hostname": "$(hostname)"
}
EOF
}

# Function to validate Terraform configuration
validate_terraform() {
    echo "Validating Terraform configuration..."
    terraform validate || error "Terraform validation failed"
}

# Function to check for sensitive data
check_sensitive_data() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    
    echo "Checking for sensitive data..."
    local sensitive_patterns=(
        "password"
        "secret"
        "key"
        "token"
        "credential"
    )
    
    for pattern in "${sensitive_patterns[@]}"; do
        if grep -i "${pattern}" "${tfvars_file}" > /dev/null; then
            warn "Found potentially sensitive data (${pattern}) in ${tfvars_file}"
        fi
    done
}

# Function to run cost estimation
estimate_costs() {
    local plan_file=$1
    local cost_file="${plan_file%.tfplan}.cost"
    
    if command -v infracost > /dev/null; then
        echo "Estimating costs..."
        infracost breakdown --path "${plan_file}" --format json > "${cost_file}" || warn "Cost estimation failed"
    else
        warn "infracost not installed - skipping cost estimation"
    fi
}

# Function to check for required variables
check_required_variables() {
    local env=$1
    local tfvars_file="environments/${env}.tfvars"
    
    echo "Checking required variables..."
    local required_vars=(
        "environment"
        "aws_region"
        "domain_name"
        "vpc_cidr"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}\s*=" "${tfvars_file}"; then
            error "Required variable '${var}' not found in ${tfvars_file}"
        fi
    done
}

# Main function
main() {
    local env=$1
    local plan_output=$2
    
    if [[ -z "${env}" ]]; then
        error "Environment name not provided. Usage: $0 <environment> [plan-output]"
    fi
    
    validate_environment "${env}"
    
    # Create plan directory
    local plan_dir=$(create_plan_directory "${env}")
    local plan_file="${plan_dir}/plan.tfplan"
    local summary_file="${plan_dir}/summary.txt"
    
    info "Using plan directory: ${plan_dir}"
    
    # Run validations
    validate_terraform
    check_required_variables "${env}"
    check_sensitive_data "${env}"
    
    # Select workspace
    terraform workspace select "${env}" || terraform workspace new "${env}"
    
    # Run terraform plan
    echo "Running terraform plan..."
    terraform plan \
        -var-file="environments/${env}.tfvars" \
        -out="${plan_file}" \
        || error "Terraform plan failed"
    
    # Generate plan summary
    generate_plan_summary "${plan_file}" "${summary_file}"
    
    # Save metadata
    save_plan_metadata "${plan_dir}" "${env}"
    
    # Estimate costs
    estimate_costs "${plan_file}"
    
    # Copy plan to output location if specified
    if [[ -n "${plan_output}" ]]; then
        cp "${plan_file}" "${plan_output}"
        success "Plan saved to: ${plan_output}"
    fi
    
    success "Plan generated successfully"
    echo
    echo "Plan directory: ${plan_dir}"
    echo "Plan file: ${plan_file}"
    echo "Summary file: ${summary_file}"
    echo
    echo "To apply this plan, run:"
    echo "terraform apply '${plan_file}'"
}

# Execute plan
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
