#!/bin/bash

# Terraform Security and Compliance Check Script

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

# Function to check prerequisites
check_prerequisites() {
    local required_tools=("tfsec" "checkov" "terraform")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "${tool}" &> /dev/null; then
            error "${tool} is required but not installed"
        fi
    done
}

# Function to validate environment
validate_environment() {
    local env=$1
    local valid_envs=("dev" "staging" "prod")
    
    if [[ ! " ${valid_envs[@]} " =~ " ${env} " ]]; then
        error "Invalid environment: $env. Must be one of: ${valid_envs[*]}"
    fi
}

# Function to run tfsec scan
run_tfsec() {
    local output_dir=$1
    
    info "Running tfsec security scan..."
    
    tfsec . --format json > "${output_dir}/tfsec.json" || true
    tfsec . --format markdown > "${output_dir}/tfsec.md" || true
    
    # Generate summary
    local high_count=$(jq '[.results[] | select(.severity == "HIGH")] | length' "${output_dir}/tfsec.json")
    local medium_count=$(jq '[.results[] | select(.severity == "MEDIUM")] | length' "${output_dir}/tfsec.json")
    local low_count=$(jq '[.results[] | select(.severity == "LOW")] | length' "${output_dir}/tfsec.json")
    
    echo "TFSec Findings Summary:" > "${output_dir}/security_summary.md"
    echo "- High: ${high_count}" >> "${output_dir}/security_summary.md"
    echo "- Medium: ${medium_count}" >> "${output_dir}/security_summary.md"
    echo "- Low: ${low_count}" >> "${output_dir}/security_summary.md"
    echo "" >> "${output_dir}/security_summary.md"
    
    success "TFSec scan completed"
}

# Function to run checkov scan
run_checkov() {
    local output_dir=$1
    
    info "Running Checkov compliance scan..."
    
    checkov -d . --output json > "${output_dir}/checkov.json" || true
    checkov -d . --output markdown > "${output_dir}/checkov.md" || true
    
    # Generate summary
    local failed_checks=$(jq '.summary.failed' "${output_dir}/checkov.json")
    local passed_checks=$(jq '.summary.passed' "${output_dir}/checkov.json")
    local skipped_checks=$(jq '.summary.skipped' "${output_dir}/checkov.json")
    
    echo "Checkov Findings Summary:" >> "${output_dir}/security_summary.md"
    echo "- Failed: ${failed_checks}" >> "${output_dir}/security_summary.md"
    echo "- Passed: ${passed_checks}" >> "${output_dir}/security_summary.md"
    echo "- Skipped: ${skipped_checks}" >> "${output_dir}/security_summary.md"
    echo "" >> "${output_dir}/security_summary.md"
    
    success "Checkov scan completed"
}

# Function to check for sensitive data
check_sensitive_data() {
    local output_dir=$1
    
    info "Checking for sensitive data..."
    
    local sensitive_patterns=(
        "password"
        "secret"
        "key"
        "token"
        "credential"
        "api[-_]key"
        "access[-_]key"
        "private[-_]key"
    )
    
    echo "Sensitive Data Findings:" >> "${output_dir}/security_summary.md"
    
    for pattern in "${sensitive_patterns[@]}"; do
        local findings=$(find . -type f -name "*.tf" -o -name "*.tfvars" | xargs grep -l -i "${pattern}" || true)
        if [[ -n "${findings}" ]]; then
            echo "- Found potential ${pattern} in:" >> "${output_dir}/security_summary.md"
            echo "${findings}" | sed 's/^/  - /' >> "${output_dir}/security_summary.md"
        fi
    done
    
    echo "" >> "${output_dir}/security_summary.md"
    
    success "Sensitive data check completed"
}

# Function to check IAM permissions
check_iam_permissions() {
    local output_dir=$1
    
    info "Analyzing IAM permissions..."
    
    echo "IAM Analysis:" >> "${output_dir}/security_summary.md"
    
    # Check for overly permissive IAM policies
    local admin_policies=$(find . -type f -name "*.tf" | xargs grep -l "Effect.*Allow.*Action.*\*" || true)
    if [[ -n "${admin_policies}" ]]; then
        echo "- Found potentially overly permissive IAM policies:" >> "${output_dir}/security_summary.md"
        echo "${admin_policies}" | sed 's/^/  - /' >> "${output_dir}/security_summary.md"
    fi
    
    echo "" >> "${output_dir}/security_summary.md"
    
    success "IAM analysis completed"
}

# Function to check security group rules
check_security_groups() {
    local output_dir=$1
    
    info "Analyzing security group rules..."
    
    echo "Security Group Analysis:" >> "${output_dir}/security_summary.md"
    
    # Check for overly permissive security group rules
    local open_rules=$(find . -type f -name "*.tf" | xargs grep -l "0\.0\.0\.0/0" || true)
    if [[ -n "${open_rules}" ]]; then
        echo "- Found potentially open security group rules:" >> "${output_dir}/security_summary.md"
        echo "${open_rules}" | sed 's/^/  - /' >> "${output_dir}/security_summary.md"
    fi
    
    echo "" >> "${output_dir}/security_summary.md"
    
    success "Security group analysis completed"
}

# Function to generate security report
generate_report() {
    local env=$1
    local output_dir=$2
    
    info "Generating security report..."
    
    cat > "${output_dir}/security_report.md" << EOF
# Infrastructure Security Report

## Environment: ${env}
Generated on: $(date)

## Overview
This report contains security findings from multiple scanning tools and checks.

## Summary
$(cat "${output_dir}/security_summary.md")

## Detailed Findings

### TFSec Results
$(cat "${output_dir}/tfsec.md")

### Checkov Results
$(cat "${output_dir}/checkov.md")

## Recommendations

1. Review and address all HIGH severity findings immediately
2. Create remediation plan for MEDIUM severity findings
3. Evaluate LOW severity findings for potential improvements
4. Implement security best practices:
   - Use least privilege principle for IAM roles
   - Restrict security group rules to specific IPs/ranges
   - Encrypt sensitive data and use secure secret management
   - Enable logging and monitoring for all resources
   - Regularly rotate credentials and access keys
   - Use multi-factor authentication where possible

## Next Steps

1. Review this report with the security team
2. Prioritize findings based on risk and impact
3. Create tickets for required remediation work
4. Schedule follow-up scan after fixes are implemented

## Notes

- Some findings may be false positives
- Consider context and requirements when evaluating findings
- Maintain balance between security and functionality
EOF
    
    success "Security report generated"
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
    scan <env>              Run all security scans
    tfsec <env>            Run TFSec scan only
    checkov <env>          Run Checkov scan only
    sensitive <env>        Check for sensitive data
    iam <env>             Check IAM permissions
    sg <env>              Check security groups
    report <env>          Generate security report

Options:
    env     Environment (dev, staging, prod)

Examples:
    $0 scan prod
    $0 tfsec staging
    $0 sensitive dev
EOF
    exit 1
}

# Main function
main() {
    local command=$1
    shift
    
    check_prerequisites
    
    case "${command}" in
        scan)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="security-scans/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            run_tfsec "${output_dir}"
            run_checkov "${output_dir}"
            check_sensitive_data "${output_dir}"
            check_iam_permissions "${output_dir}"
            check_security_groups "${output_dir}"
            generate_report "$1" "${output_dir}"
            success "Security scan completed: ${output_dir}"
            ;;
        tfsec)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="security-scans/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            run_tfsec "${output_dir}"
            success "TFSec scan completed: ${output_dir}"
            ;;
        checkov)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="security-scans/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            run_checkov "${output_dir}"
            success "Checkov scan completed: ${output_dir}"
            ;;
        sensitive)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="security-scans/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            check_sensitive_data "${output_dir}"
            success "Sensitive data check completed: ${output_dir}"
            ;;
        iam)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="security-scans/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            check_iam_permissions "${output_dir}"
            success "IAM check completed: ${output_dir}"
            ;;
        sg)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="security-scans/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            check_security_groups "${output_dir}"
            success "Security group check completed: ${output_dir}"
            ;;
        report)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="security-scans/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            run_tfsec "${output_dir}"
            run_checkov "${output_dir}"
            check_sensitive_data "${output_dir}"
            check_iam_permissions "${output_dir}"
            check_security_groups "${output_dir}"
            generate_report "$1" "${output_dir}"
            success "Security report generated: ${output_dir}"
            ;;
        *)
            usage
            ;;
    esac
}

# Execute command
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    [[ $# -gt 0 ]] || usage
    main "$@"
fi
