#!/bin/bash

# Terraform Cost Analysis Script

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
    local required_tools=("infracost" "terraform" "jq")
    
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

# Function to generate cost breakdown
generate_cost_breakdown() {
    local env=$1
    local output_dir=$2
    
    info "Generating cost breakdown for ${env} environment..."
    
    infracost breakdown \
        --path . \
        --terraform-var-file="environments/${env}.tfvars" \
        --format json \
        --out-file "${output_dir}/costs.json"
    
    infracost output \
        --path "${output_dir}/costs.json" \
        --format html \
        --out-file "${output_dir}/costs.html"
    
    success "Cost breakdown generated"
}

# Function to analyze cost differences
analyze_cost_diff() {
    local env=$1
    local output_dir=$2
    
    info "Analyzing cost differences..."
    
    # Get current state costs
    terraform show -json | \
        jq -r '.values.root_module.resources[] | select(.values.monthly_cost != null) | {name: .name, cost: .values.monthly_cost}' \
        > "${output_dir}/current_costs.json"
    
    # Get planned costs
    terraform plan -out="${output_dir}/plan.tfplan" -var-file="environments/${env}.tfvars"
    terraform show -json "${output_dir}/plan.tfplan" | \
        jq -r '.resource_changes[] | select(.change.after.monthly_cost != null) | {name: .address, cost: .change.after.monthly_cost}' \
        > "${output_dir}/planned_costs.json"
    
    # Compare costs
    jq -s '
        def diff_costs:
            map({key: .name, value: .cost}) |
            from_entries as $current |
            map({key: .name, value: .cost}) |
            from_entries as $planned |
            ($planned | keys) + ($current | keys) |
            unique |
            map({
                name: .,
                current_cost: ($current[.] // 0),
                planned_cost: ($planned[.] // 0),
                diff: (($planned[.] // 0) - ($current[.] // 0))
            })
        ;
        .[0] as $current |
        .[1] as $planned |
        [$current, $planned] |
        diff_costs
    ' "${output_dir}/current_costs.json" "${output_dir}/planned_costs.json" \
        > "${output_dir}/cost_diff.json"
    
    success "Cost difference analysis completed"
}

# Function to generate optimization recommendations
generate_recommendations() {
    local env=$1
    local output_dir=$2
    
    info "Generating optimization recommendations..."
    
    # Initialize recommendations file
    cat > "${output_dir}/recommendations.md" << EOF
# Cost Optimization Recommendations

## Overview
Generated on: $(date)
Environment: ${env}

## Recommendations
EOF
    
    # Analyze instance types
    jq -r '.[] | select(.planned_cost > 100) | .name' "${output_dir}/cost_diff.json" | while read -r resource; do
        echo "### ${resource}" >> "${output_dir}/recommendations.md"
        echo "- Consider using reserved instances or savings plans" >> "${output_dir}/recommendations.md"
        echo "- Evaluate resource utilization patterns" >> "${output_dir}/recommendations.md"
        echo "" >> "${output_dir}/recommendations.md"
    done
    
    # Check for unused resources
    terraform show -json | \
        jq -r '.values.root_module.resources[] | select(.values.tags.Environment == null) | .address' | \
        while read -r resource; do
            echo "### ${resource}" >> "${output_dir}/recommendations.md"
            echo "- Missing environment tags" >> "${output_dir}/recommendations.md"
            echo "- Review if resource is needed" >> "${output_dir}/recommendations.md"
            echo "" >> "${output_dir}/recommendations.md"
        done
    
    success "Optimization recommendations generated"
}

# Function to create cost report
create_cost_report() {
    local env=$1
    local output_dir=$2
    
    info "Creating cost report..."
    
    cat > "${output_dir}/report.md" << EOF
# Infrastructure Cost Report

## Environment: ${env}
Generated on: $(date)

## Cost Summary
$(jq -r '
    def format_cost:
        if . then
            if . < 0 then
                "-\$" + (-. | floor | tostring)
            else
                "\$" + (. | floor | tostring)
            end
        else
            "\$0"
        end
    ;
    [
        "| Resource | Current Cost | Planned Cost | Difference |",
        "|----------|--------------|--------------|------------|",
        (.[] | "| \(.name) | \(.current_cost | format_cost) | \(.planned_cost | format_cost) | \(.diff | format_cost) |")
    ] | .[]
' "${output_dir}/cost_diff.json")

## Cost Breakdown
![Cost Breakdown](./costs.html)

## Recommendations
$(cat "${output_dir}/recommendations.md")

## Next Steps
1. Review the cost breakdown and recommendations
2. Implement suggested optimizations
3. Monitor cost changes over time
4. Schedule regular cost reviews

## Notes
- All costs are monthly estimates
- Actual costs may vary based on usage
- Remember to consider reserved instances and savings plans
EOF
    
    success "Cost report created"
}

# Function to analyze historical costs
analyze_historical_costs() {
    local env=$1
    local output_dir=$2
    local days=${3:-30}
    
    info "Analyzing historical costs for the past ${days} days..."
    
    # Get historical cost data from AWS Cost Explorer
    aws ce get-cost-and-usage \
        --time-period Start=$(date -d "${days} days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
        --granularity DAILY \
        --metrics BlendedCost \
        --group-by Type=TAG,Key=Environment \
        | jq -r '.ResultsByTime[] | select(.Groups[].Keys[] | contains("'"${env}"'"))' \
        > "${output_dir}/historical_costs.json"
    
    # Generate trend analysis
    cat > "${output_dir}/trends.md" << EOF
# Cost Trends Analysis

## Environment: ${env}
Period: Last ${days} days

## Daily Cost Trend
$(jq -r '
    "Date: " + .TimePeriod.Start + 
    " Cost: $" + (.Groups[].Metrics.BlendedCost.Amount | tonumber | floor | tostring)
' "${output_dir}/historical_costs.json")

## Observations
- Average daily cost: $(jq -r '[.Groups[].Metrics.BlendedCost.Amount | tonumber] | add/length' "${output_dir}/historical_costs.json" | xargs printf "$%.2f")
- Cost trend: $(jq -r '
    [.Groups[].Metrics.BlendedCost.Amount | tonumber] as $costs |
    if $costs[-1] > $costs[0] then "Increasing" else "Decreasing" end
' "${output_dir}/historical_costs.json")
EOF
    
    success "Historical cost analysis completed"
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
    analyze <env> [days]    Analyze costs for environment
    diff <env>             Show cost differences
    recommend <env>        Generate optimization recommendations
    report <env>           Create comprehensive cost report

Options:
    env     Environment (dev, staging, prod)
    days    Number of days for historical analysis (default: 30)

Examples:
    $0 analyze prod 60
    $0 diff staging
    $0 recommend dev
    $0 report prod
EOF
    exit 1
}

# Main function
main() {
    local command=$1
    shift
    
    check_prerequisites
    
    case "${command}" in
        analyze)
            [[ $# -ge 1 ]] || usage
            validate_environment "$1"
            local output_dir="cost-analysis/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            generate_cost_breakdown "$1" "${output_dir}"
            analyze_historical_costs "$1" "${output_dir}" "${2:-30}"
            success "Analysis completed: ${output_dir}"
            ;;
        diff)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="cost-analysis/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            analyze_cost_diff "$1" "${output_dir}"
            success "Cost diff completed: ${output_dir}"
            ;;
        recommend)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="cost-analysis/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            generate_recommendations "$1" "${output_dir}"
            success "Recommendations generated: ${output_dir}"
            ;;
        report)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            local output_dir="cost-analysis/$1/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "${output_dir}"
            generate_cost_breakdown "$1" "${output_dir}"
            analyze_cost_diff "$1" "${output_dir}"
            generate_recommendations "$1" "${output_dir}"
            create_cost_report "$1" "${output_dir}"
            success "Report created: ${output_dir}"
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
