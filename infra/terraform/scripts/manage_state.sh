#!/bin/bash

# Terraform State Management Script

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
}

# Function to backup state
backup_state() {
    local env=$1
    local backup_dir="state-backups/${env}/$(date +%Y%m%d_%H%M%S)"
    
    mkdir -p "${backup_dir}"
    
    info "Creating state backup in ${backup_dir}..."
    terraform state pull > "${backup_dir}/terraform.tfstate"
    
    success "State backup created: ${backup_dir}/terraform.tfstate"
}

# Function to list state resources
list_resources() {
    info "Listing state resources..."
    terraform state list
}

# Function to show state resource
show_resource() {
    local resource=$1
    
    info "Showing details for resource: ${resource}"
    terraform state show "${resource}"
}

# Function to move state resource
move_resource() {
    local source=$1
    local destination=$2
    
    confirm "Moving resource from '${source}' to '${destination}'"
    
    info "Moving state resource..."
    terraform state mv "${source}" "${destination}"
    
    success "Resource moved successfully"
}

# Function to remove state resource
remove_resource() {
    local resource=$1
    
    confirm "Removing resource '${resource}' from state (resource will NOT be destroyed)"
    
    info "Removing state resource..."
    terraform state rm "${resource}"
    
    success "Resource removed from state"
}

# Function to import state resource
import_resource() {
    local resource=$1
    local id=$2
    
    confirm "Importing resource '${id}' as '${resource}'"
    
    info "Importing state resource..."
    terraform import "${resource}" "${id}"
    
    success "Resource imported successfully"
}

# Function to refresh state
refresh_state() {
    local env=$1
    
    confirm "Refreshing state for environment '${env}'"
    
    info "Refreshing state..."
    terraform refresh -var-file="environments/${env}.tfvars"
    
    success "State refreshed successfully"
}

# Function to check state consistency
check_state() {
    info "Checking state consistency..."
    
    # Verify state can be read
    terraform state pull > /dev/null || error "Failed to read state"
    
    # Run plan to check for drift
    if terraform plan -detailed-exitcode > /dev/null; then
        success "State is consistent with configuration"
    else
        warn "State drift detected"
    fi
}

# Function to list state backups
list_backups() {
    local env=$1
    local backup_dir="state-backups/${env}"
    
    if [[ -d "${backup_dir}" ]]; then
        info "Available state backups for ${env}:"
        ls -lh "${backup_dir}"
    else
        warn "No backups found for environment ${env}"
    fi
}

# Function to restore state backup
restore_backup() {
    local env=$1
    local backup_file=$2
    
    if [[ ! -f "${backup_file}" ]]; then
        error "Backup file not found: ${backup_file}"
    fi
    
    confirm "Restoring state from backup: ${backup_file}"
    
    # Create backup of current state
    backup_state "${env}"
    
    info "Restoring state..."
    terraform state push "${backup_file}"
    
    success "State restored successfully"
}

# Function to clean old backups
clean_backups() {
    local env=$1
    local days=${2:-30}
    local backup_dir="state-backups/${env}"
    
    if [[ -d "${backup_dir}" ]]; then
        confirm "Removing backups older than ${days} days for environment ${env}"
        
        find "${backup_dir}" -type f -name "terraform.tfstate" -mtime "+${days}" -exec rm {} \;
        find "${backup_dir}" -type d -empty -delete
        
        success "Old backups cleaned successfully"
    else
        warn "No backups found for environment ${env}"
    fi
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
    backup <env>                     Create state backup
    list <env>                       List state resources
    show <env> <resource>           Show state resource details
    move <env> <src> <dst>          Move resource in state
    remove <env> <resource>         Remove resource from state
    import <env> <resource> <id>    Import resource into state
    refresh <env>                   Refresh state
    check <env>                     Check state consistency
    list-backups <env>              List available backups
    restore <env> <backup-file>     Restore state from backup
    clean <env> [days]              Clean old backups (default: 30 days)

Options:
    env         Environment (dev, staging, prod)
    resource    Resource address (e.g., aws_instance.example)
    src         Source resource address
    dst         Destination resource address
    id          Resource ID to import
    days        Number of days for backup retention

Examples:
    $0 backup prod
    $0 list staging
    $0 show dev aws_instance.example
    $0 move prod aws_instance.old aws_instance.new
    $0 clean staging 7
EOF
    exit 1
}

# Main function
main() {
    local command=$1
    shift
    
    case "${command}" in
        backup)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            backup_state "$1"
            ;;
        list)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            list_resources
            ;;
        show)
            [[ $# -eq 2 ]] || usage
            validate_environment "$1"
            show_resource "$2"
            ;;
        move)
            [[ $# -eq 3 ]] || usage
            validate_environment "$1"
            move_resource "$2" "$3"
            ;;
        remove)
            [[ $# -eq 2 ]] || usage
            validate_environment "$1"
            remove_resource "$2"
            ;;
        import)
            [[ $# -eq 3 ]] || usage
            validate_environment "$1"
            import_resource "$2" "$3"
            ;;
        refresh)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            refresh_state "$1"
            ;;
        check)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            check_state
            ;;
        list-backups)
            [[ $# -eq 1 ]] || usage
            validate_environment "$1"
            list_backups "$1"
            ;;
        restore)
            [[ $# -eq 2 ]] || usage
            validate_environment "$1"
            restore_backup "$1" "$2"
            ;;
        clean)
            [[ $# -ge 1 ]] || usage
            validate_environment "$1"
            clean_backups "$1" "${2:-30}"
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
