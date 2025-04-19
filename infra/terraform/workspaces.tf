# Workspace-specific configurations
locals {
  # Map of workspace names to their configurations
  workspace_configs = {
    default = {
      environment = "dev"
      region     = "us-west-2"
      profile    = "appius-dev"
    }
    staging = {
      environment = "staging"
      region     = "us-west-2"
      profile    = "appius-staging"
    }
    production = {
      environment = "prod"
      region     = "us-west-2"
      profile    = "appius-prod"
    }
  }

  # Current workspace configuration
  current_workspace = local.workspace_configs[terraform.workspace]

  # Workspace-specific tags
  workspace_tags = {
    Workspace   = terraform.workspace
    Environment = local.current_workspace.environment
    ManagedBy   = "terraform"
    Profile     = local.current_workspace.profile
  }
}

# Workspace validation
resource "null_resource" "workspace_validation" {
  count = contains(keys(local.workspace_configs), terraform.workspace) ? 0 : 1

  provisioner "local-exec" {
    command = <<-EOT
      echo "Error: Invalid workspace '${terraform.workspace}'"
      echo "Valid workspaces are: ${join(", ", keys(local.workspace_configs))}"
      exit 1
    EOT
  }
}

# Workspace initialization
resource "null_resource" "workspace_init" {
  depends_on = [null_resource.workspace_validation]

  triggers = {
    workspace = terraform.workspace
    config    = jsonencode(local.current_workspace)
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Initializing workspace: ${terraform.workspace}"
      echo "Environment: ${local.current_workspace.environment}"
      echo "Region: ${local.current_workspace.region}"
      echo "Profile: ${local.current_workspace.profile}"
    EOT
  }
}

# State file configurations for different workspaces
locals {
  state_configs = {
    default = {
      bucket = "appius-terraform-state-dev"
      key    = "terraform.tfstate"
      region = "us-west-2"
    }
    staging = {
      bucket = "appius-terraform-state-staging"
      key    = "terraform.tfstate"
      region = "us-west-2"
    }
    production = {
      bucket = "appius-terraform-state-prod"
      key    = "terraform.tfstate"
      region = "us-west-2"
    }
  }
}

# Workspace-specific provider configurations
provider "aws" {
  region  = local.current_workspace.region
  profile = local.current_workspace.profile

  default_tags {
    tags = local.workspace_tags
  }

  assume_role {
    role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/terraform-${local.current_workspace.environment}"
  }
}

# Workspace-specific backend configuration
terraform {
  backend "s3" {
    # These values will be filled in during initialization
    # terraform init \
    #   -backend-config="bucket=${local.state_configs[terraform.workspace].bucket}" \
    #   -backend-config="key=${local.state_configs[terraform.workspace].key}" \
    #   -backend-config="region=${local.state_configs[terraform.workspace].region}" \
    #   -backend-config="profile=${local.workspace_configs[terraform.workspace].profile}"
  }
}

# Workspace-specific variable overrides
locals {
  workspace_variables = {
    default = {
      domain_name = "dev.appius.com"
      vpc_cidr    = "10.1.0.0/16"
      instance_types = {
        eks   = "t3.small"
        rds   = "db.t3.small"
        redis = "cache.t3.micro"
      }
    }
    staging = {
      domain_name = "staging.appius.com"
      vpc_cidr    = "10.2.0.0/16"
      instance_types = {
        eks   = "t3.medium"
        rds   = "db.t3.medium"
        redis = "cache.t3.small"
      }
    }
    production = {
      domain_name = "appius.com"
      vpc_cidr    = "10.0.0.0/16"
      instance_types = {
        eks   = "t3.large"
        rds   = "db.t3.large"
        redis = "cache.t3.medium"
      }
    }
  }

  # Current workspace variables
  workspace_vars = local.workspace_variables[terraform.workspace]
}

# Workspace-specific outputs
output "workspace_info" {
  description = "Information about the current workspace"
  value = {
    workspace   = terraform.workspace
    environment = local.current_workspace.environment
    region      = local.current_workspace.region
    profile     = local.current_workspace.profile
    state = {
      bucket = local.state_configs[terraform.workspace].bucket
      key    = local.state_configs[terraform.workspace].key
      region = local.state_configs[terraform.workspace].region
    }
    variables = local.workspace_vars
  }
}

# Workspace management commands
resource "null_resource" "workspace_commands" {
  provisioner "local-exec" {
    command = <<-EOT
      echo "Available workspace commands:"
      echo "  terraform workspace new <name>    # Create a new workspace"
      echo "  terraform workspace select <name> # Switch to a workspace"
      echo "  terraform workspace list          # List all workspaces"
      echo "  terraform workspace show          # Show current workspace"
      echo "  terraform workspace delete <name> # Delete a workspace"
    EOT
  }
}
