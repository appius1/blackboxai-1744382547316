#!/bin/bash

# Terraform Module Management Script

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

# Function to validate module name
validate_module_name() {
    local module=$1
    
    if [[ ! $module =~ ^[a-z][a-z0-9_-]*$ ]]; then
        error "Invalid module name. Use lowercase letters, numbers, hyphens, and underscores"
    fi
}

# Function to create new module
create_module() {
    local module=$1
    local module_dir="modules/${module}"
    
    validate_module_name "${module}"
    
    if [[ -d "${module_dir}" ]]; then
        error "Module already exists: ${module}"
    fi
    
    info "Creating module: ${module}"
    
    # Create module directory structure
    mkdir -p "${module_dir}"/{main,variables,outputs,examples,tests}
    
    # Create main configuration files
    cat > "${module_dir}/main.tf" << EOF
# Main module configuration
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Resource configurations go here
EOF
    
    # Create variables file
    cat > "${module_dir}/variables.tf" << EOF
# Input variables
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
EOF
    
    # Create outputs file
    cat > "${module_dir}/outputs.tf" << EOF
# Output values
output "module_name" {
  description = "Name of the module"
  value       = "${module}"
}
EOF
    
    # Create example configuration
    mkdir -p "${module_dir}/examples/basic"
    cat > "${module_dir}/examples/basic/main.tf" << EOF
module "${module}" {
  source = "../.."
  
  environment = "dev"
  tags = {
    Terraform = "true"
    Module    = "${module}"
  }
}
EOF
    
    # Create test configuration
    cat > "${module_dir}/tests/main.tf" << EOF
module "test" {
  source = ".."
  
  environment = "test"
  tags = {
    Test = "true"
  }
}
EOF
    
    # Create README
    cat > "${module_dir}/README.md" << EOF
# ${module} Terraform Module

## Description

Brief description of the module's purpose and functionality.

## Requirements

- Terraform >= 1.0.0
- AWS Provider ~> 4.0

## Usage

\`\`\`hcl
module "${module}" {
  source = "path/to/${module}"
  
  environment = "dev"
  tags = {
    Terraform = "true"
    Module    = "${module}"
  }
}
\`\`\`

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| environment | Environment name | string | n/a | yes |
| tags | Resource tags | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| module_name | Name of the module |

## Examples

See the [examples](./examples) directory for working examples.

## Testing

\`\`\`bash
cd tests
terraform init
terraform plan
\`\`\`

## License

MIT Licensed. See LICENSE for full details.
EOF
    
    success "Module created successfully: ${module}"
}

# Function to validate module
validate_module() {
    local module=$1
    local module_dir="modules/${module}"
    
    if [[ ! -d "${module_dir}" ]]; then
        error "Module not found: ${module}"
    fi
    
    info "Validating module: ${module}"
    
    # Initialize and validate module
    (cd "${module_dir}" && terraform init -backend=false && terraform validate)
    
    # Check formatting
    terraform fmt -check -recursive "${module_dir}"
    
    # Run tfsec if available
    if command -v tfsec &> /dev/null; then
        tfsec "${module_dir}"
    else
        warn "tfsec not installed - skipping security scan"
    fi
    
    success "Module validation completed"
}

# Function to test module
test_module() {
    local module=$1
    local module_dir="modules/${module}"
    
    if [[ ! -d "${module_dir}/tests" ]]; then
        error "Tests not found for module: ${module}"
    fi
    
    info "Testing module: ${module}"
    
    # Run tests
    (cd "${module_dir}/tests" && \
        terraform init && \
        terraform plan && \
        terraform validate)
    
    success "Module tests completed"
}

# Function to list modules
list_modules() {
    info "Available modules:"
    
    if [[ -d "modules" ]]; then
        for module in modules/*/; do
            if [[ -d "${module}" ]]; then
                echo "- $(basename "${module}")"
            fi
        done
    else
        warn "No modules directory found"
    fi
}

# Function to update module documentation
update_docs() {
    local module=$1
    local module_dir="modules/${module}"
    
    if [[ ! -d "${module_dir}" ]]; then
        error "Module not found: ${module}"
    fi
    
    info "Updating documentation for module: ${module}"
    
    # Generate terraform-docs if available
    if command -v terraform-docs &> /dev/null; then
        terraform-docs markdown table --output-file "${module_dir}/README.md" "${module_dir}"
    else
        warn "terraform-docs not installed - skipping documentation generation"
    fi
    
    success "Documentation updated"
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
    create <module>     Create a new module
    validate <module>   Validate a module
    test <module>      Run module tests
    list               List available modules
    update-docs <module> Update module documentation

Options:
    module    Name of the module

Examples:
    $0 create vpc
    $0 validate vpc
    $0 test vpc
    $0 list
    $0 update-docs vpc
EOF
    exit 1
}

# Main function
main() {
    local command=$1
    shift
    
    case "${command}" in
        create)
            [[ $# -eq 1 ]] || usage
            create_module "$1"
            ;;
        validate)
            [[ $# -eq 1 ]] || usage
            validate_module "$1"
            ;;
        test)
            [[ $# -eq 1 ]] || usage
            test_module "$1"
            ;;
        list)
            list_modules
            ;;
        update-docs)
            [[ $# -eq 1 ]] || usage
            update_docs "$1"
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
