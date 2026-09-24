#!/usr/bin/env bash
set -euo pipefail

#
# deploy-infra.sh - Deploy CDK infrastructure to AWS
#
# Usage: npm run deploy [options]
#
# Options:
#   --skip-bootstrap          Skip the CDK bootstrap step
#   --require-approval LEVEL  Approval level for CDK deploy (never/any-change/broadening)
#   --help                    Show this help message
#

# Configuration
DEFAULT_APPROVAL="broadening"

# Color output helpers
print_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}

# Show help message
show_help() {
    cat << 'EOF'
Usage: npm run deploy [-- options]

Deploys the CDK infrastructure to AWS.

Steps performed:
  1. Check prerequisites (node, npm, aws cli, credentials)
  2. Install npm dependencies
  3. Build TypeScript
  4. Run CDK bootstrap (unless --skip-bootstrap)
  5. Run CDK deploy

Options:
  --skip-bootstrap          Skip the CDK bootstrap step (for subsequent deploys)
  --require-approval LEVEL  Approval level for CDK deploy (default: broadening)
                            Values: never, any-change, broadening
  --help                    Show this help message

Examples:
  npm run deploy                              # Full deployment with bootstrap
  npm run deploy -- --skip-bootstrap          # Deploy without bootstrap
  npm run deploy -- --require-approval never  # Deploy without approval prompts
EOF
    exit 0
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed."
        echo "  Please install Node.js from https://nodejs.org/"
        echo "  Or use a version manager like nvm: https://github.com/nvm-sh/nvm"
        exit 1
    fi
    local node_version
    node_version=$(node --version)
    print_success "Node.js found: $node_version"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        echo "  npm should be included with Node.js. Please reinstall Node.js."
        exit 1
    fi
    local npm_version
    npm_version=$(npm --version)
    print_success "npm found: v$npm_version"

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed."
        echo "  Install from: https://aws.amazon.com/cli/"
        exit 1
    fi
    local aws_version
    aws_version=$(aws --version 2>&1 | cut -d' ' -f1)
    print_success "AWS CLI found: $aws_version"

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured or are invalid."
        echo ""
        echo "  Please configure your AWS credentials:"
        echo "    aws configure"
        echo ""
        echo "  Or set environment variables:"
        echo "    export AWS_ACCESS_KEY_ID=your_key"
        echo "    export AWS_SECRET_ACCESS_KEY=your_secret"
        echo "    export AWS_REGION=us-east-1"
        echo ""
        exit 1
    fi

    local caller_identity
    caller_identity=$(aws sts get-caller-identity --query 'Account' --output text)
    print_success "AWS credentials configured (Account: $caller_identity)"
}

# Install dependencies
install_dependencies() {
    print_info "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Build TypeScript
build_package() {
    print_info "Building TypeScript..."
    npm run build
    print_success "TypeScript compiled successfully"
}

# Bootstrap CDK
bootstrap_cdk() {
    print_info "Bootstrapping CDK..."
    npx cdk bootstrap
    print_success "CDK bootstrap complete"
}

# Deploy CDK
deploy_cdk() {
    local approval_level="$1"
    print_info "Deploying CDK stack (require-approval: $approval_level)..."
    npx cdk deploy --require-approval "$approval_level"
    print_success "CDK deployment complete"
}

# Main function
main() {
    local skip_bootstrap=false
    local require_approval="$DEFAULT_APPROVAL"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-bootstrap)
                skip_bootstrap=true
                shift
                ;;
            --require-approval)
                if [[ -n "${2:-}" ]]; then
                    case "$2" in
                        never|any-change|broadening)
                            require_approval="$2"
                            shift 2
                            ;;
                        *)
                            print_error "Invalid approval level: $2"
                            echo "  Valid values: never, any-change, broadening"
                            exit 1
                            ;;
                    esac
                else
                    print_error "--require-approval requires a level (never/any-change/broadening)"
                    exit 1
                fi
                ;;
            --help|-h)
                show_help
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information."
                exit 1
                ;;
        esac
    done

    echo ""
    echo "=================================="
    echo "  CDK Infrastructure Deployment"
    echo "=================================="
    echo ""

    # Check prerequisites
    check_prerequisites
    echo ""

    # Install dependencies
    install_dependencies
    echo ""

    # Build TypeScript
    build_package
    echo ""

    # Bootstrap CDK (unless skipped)
    if [[ "$skip_bootstrap" == false ]]; then
        bootstrap_cdk
        echo ""
    else
        print_info "Skipping CDK bootstrap (--skip-bootstrap flag)"
        echo ""
    fi

    # Deploy CDK
    deploy_cdk "$require_approval"
    echo ""

    # Final success message
    echo "=================================="
    print_success "Infrastructure deployment complete!"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "  - View your resources in the AWS Console"
    echo "  - Run 'npx cdk diff' to see pending changes"
    echo "  - Run 'npx cdk destroy' to tear down the stack"
    echo ""
}

# Run main
main "$@"
