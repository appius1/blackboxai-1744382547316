#!/bin/bash

# Script to set up permissions for Terraform management scripts

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

# Function to print success
success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# List of scripts to make executable
SCRIPTS=(
    "validate_env.sh"
    "init_env.sh"
    "cleanup_env.sh"
    "plan_env.sh"
    "apply_env.sh"
    "manage_state.sh"
    "setup_permissions.sh"
    "manage_modules.sh"
    "analyze_costs.sh"
    "security_check.sh"
)

# Function to set script permissions
set_permissions() {
    local script=$1
    local script_path="${SCRIPT_DIR}/${script}"
    
    if [[ -f "${script_path}" ]]; then
        chmod +x "${script_path}"
        success "Set executable permissions for ${script}"
    else
        warn "Script not found: ${script}"
    fi
}

# Function to verify script permissions
verify_permissions() {
    local script=$1
    local script_path="${SCRIPT_DIR}/${script}"
    
    if [[ -f "${script_path}" ]]; then
        if [[ -x "${script_path}" ]]; then
            success "Verified executable permissions for ${script}"
        else
            error "Failed to set permissions for ${script}"
        fi
    fi
}

# Function to create script symlinks
create_symlinks() {
    local bin_dir="${HOME}/bin"
    
    # Create bin directory if it doesn't exist
    if [[ ! -d "${bin_dir}" ]]; then
        mkdir -p "${bin_dir}"
        echo "export PATH=\"\${PATH}:${bin_dir}\"" >> "${HOME}/.bashrc"
        warn "Added ${bin_dir} to PATH. Please restart your shell or source .bashrc"
    fi
    
    # Create symlinks
    for script in "${SCRIPTS[@]}"; do
        local script_path="${SCRIPT_DIR}/${script}"
        local link_name="${script%.sh}"
        local link_path="${bin_dir}/tf-${link_name}"
        
        if [[ -f "${script_path}" ]]; then
            ln -sf "${script_path}" "${link_path}"
            success "Created symlink: tf-${link_name}"
        fi
    done
}

# Function to verify script execution
verify_execution() {
    local script=$1
    local script_path="${SCRIPT_DIR}/${script}"
    
    if [[ -f "${script_path}" ]] && [[ -x "${script_path}" ]]; then
        if "${script_path}" --help &> /dev/null || [[ $? -eq 1 ]]; then
            success "Verified execution for ${script}"
        else
            warn "Script may have issues: ${script}"
        fi
    fi
}

# Function to create directories
create_directories() {
    local dirs=(
        "../plans"
        "../applies"
        "../state-backups"
        "../logs"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "${SCRIPT_DIR}/${dir}"
        success "Created directory: ${dir}"
    done
}

# Function to set up Git hooks
setup_git_hooks() {
    local hooks_dir="${SCRIPT_DIR}/../../.git/hooks"
    local custom_hooks_dir="${SCRIPT_DIR}/../hooks"
    
    # Create hooks directory if it doesn't exist
    mkdir -p "${custom_hooks_dir}"
    
    # Pre-commit hook
    cat > "${custom_hooks_dir}/pre-commit" << 'EOF'
#!/bin/bash
set -e

# Run Terraform format check
terraform fmt -check -recursive

# Run Terraform validation
terraform validate

# Check for sensitive data
if git diff --cached | grep -i "secret\|password\|key\|token"; then
    echo "WARNING: Potential sensitive data detected"
    exit 1
fi
EOF
    
    # Pre-push hook
    cat > "${custom_hooks_dir}/pre-push" << 'EOF'
#!/bin/bash
set -e

# Run Terraform security scan
if command -v tfsec &> /dev/null; then
    tfsec .
fi

# Run Terraform cost estimation
if command -v infracost &> /dev/null; then
    infracost breakdown --path .
fi
EOF
    
    # Make hooks executable
    chmod +x "${custom_hooks_dir}"/*
    
    # Try to set up Git hooks if .git directory exists
    if [[ -d "${SCRIPT_DIR}/../../.git" ]]; then
        mkdir -p "${hooks_dir}"
        for hook in "${custom_hooks_dir}"/*; do
            ln -sf "${hook}" "${hooks_dir}/$(basename "${hook}")"
            success "Set up Git hook: $(basename "${hook}")"
        done
    else
        warn "Git repository not found. Skipping Git hooks setup."
        warn "Custom hooks are available in: ${custom_hooks_dir}"
    fi
}

# Main function
main() {
    echo "Setting up Terraform script permissions..."
    echo "----------------------------------------"
    
    # Set permissions for all scripts
    for script in "${SCRIPTS[@]}"; do
        set_permissions "${script}"
    done
    
    echo "----------------------------------------"
    echo "Verifying permissions..."
    
    # Verify permissions for all scripts
    for script in "${SCRIPTS[@]}"; do
        verify_permissions "${script}"
    done
    
    echo "----------------------------------------"
    echo "Creating directories..."
    
    # Create required directories
    create_directories
    
    echo "----------------------------------------"
    echo "Setting up Git hooks..."
    
    # Set up Git hooks
    setup_git_hooks
    
    echo "----------------------------------------"
    echo "Creating symlinks..."
    
    # Create symlinks
    create_symlinks
    
    echo "----------------------------------------"
    echo "Verifying execution..."
    
    # Verify execution for all scripts
    for script in "${SCRIPTS[@]}"; do
        verify_execution "${script}"
    done
    
    echo "----------------------------------------"
    success "Setup completed successfully"
    echo
    echo "You can now use the following commands:"
    for script in "${SCRIPTS[@]}"; do
        echo "  tf-${script%.sh}"
    done
    echo
    echo "Remember to restart your shell or run: source ~/.bashrc"
}

# Execute setup
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
