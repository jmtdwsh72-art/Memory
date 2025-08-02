#!/bin/bash
# make_sure.sh - Scan for secrets, vulnerabilities, and security issues

set -e

echo "🔐 Running security scan..."

# Check for common secrets patterns
echo "🔍 Scanning for secrets and sensitive data..."

# Define patterns to check
SECRETS_PATTERNS=(
    "SUPABASE_SERVICE_ROLE_KEY.*=.*[A-Za-z0-9+/]{50,}"
    "CLAUDE_API_KEY.*=.*[A-Za-z0-9-_]{30,}"
    "sk-[A-Za-z0-9]{32,}"  # OpenAI API keys
    "xoxb-[A-Za-z0-9-]+"   # Slack tokens
    "ghp_[A-Za-z0-9]{36}"  # GitHub tokens
    "AKIA[0-9A-Z]{16}"     # AWS Access Keys
    "-----BEGIN.*PRIVATE KEY-----"  # Private keys
    "password.*=.*['\"][^'\"]{8,}['\"]"  # Hardcoded passwords
)

FOUND_SECRETS=false

for pattern in "${SECRETS_PATTERNS[@]}"; do
    # Check all relevant files except node_modules, .git, and dist
    if grep -r -E "$pattern" . \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        --exclude="*.log" \
        --exclude-dir=memory/logs 2>/dev/null; then
        
        echo "⚠️  POTENTIAL SECRET FOUND: Pattern '$pattern'"
        FOUND_SECRETS=true
    fi
done

if [ "$FOUND_SECRETS" = true ]; then
    echo "🚨 SECURITY ALERT: Potential secrets detected!"
    echo "💡 Actions needed:"
    echo "  - Move secrets to .env file (add to .gitignore)"
    echo "  - Use environment variables in production"
    echo "  - Rotate any exposed secrets immediately"
    echo "  - Review commit history for accidentally committed secrets"
fi

# Check .env file security
if [ -f ".env" ]; then
    echo "🔍 Checking .env file security..."
    
    # Check if .env is in .gitignore
    if [ -f ".gitignore" ]; then
        if ! grep -q "^\.env$" .gitignore; then
            echo "⚠️  .env file not in .gitignore!"
            echo "💡 Add '.env' to .gitignore to prevent accidental commits"
        fi
    else
        echo "⚠️  No .gitignore file found!"
        echo "💡 Create .gitignore and add '.env' to it"
    fi
    
    # Check .env permissions
    ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || echo "000")
    if [ "$ENV_PERMS" != "600" ] && [ "$ENV_PERMS" != "400" ]; then
        echo "⚠️  .env file permissions are too open: $ENV_PERMS"
        echo "💡 Run: chmod 600 .env"
    fi
fi

# Check for hardcoded URLs and endpoints
echo "🔍 Checking for hardcoded URLs..."
if grep -r -E "https?://[^/]*\.(supabase\.co|openai\.com|anthropic\.com)" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude="*.md" 2>/dev/null; then
    
    echo "⚠️  Hardcoded service URLs found"
    echo "💡 Consider using environment variables for service endpoints"
fi

# Check package.json for known vulnerable packages
if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
    echo "🔍 Checking for vulnerable npm packages..."
    
    if npm audit --audit-level=moderate 2>/dev/null; then
        echo "✅ No moderate+ vulnerabilities found in npm packages"
    else
        echo "⚠️  Vulnerable packages detected!"
        echo "💡 Run 'npm audit fix' to attempt automatic fixes"
    fi
fi

# Check for common security anti-patterns
echo "🔍 Checking for security anti-patterns..."

SECURITY_ISSUES=false

# Check for eval() usage
if grep -r "eval(" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    echo "⚠️  eval() usage detected - potential code injection risk"
    SECURITY_ISSUES=true
fi

# Check for process.env access without fallbacks
if grep -r "process\.env\.[A-Z_]" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | \
   grep -v "process\.env\.[A-Z_]*\s*\|\|" | grep -v "process\.env\.[A-Z_]*\s*??"; then
    echo "⚠️  Direct process.env access without fallbacks detected"
    echo "💡 Consider using fallback values: process.env.VAR || 'default'"
fi

# Check file permissions for executable files
echo "🔍 Checking file permissions..."
find . -name "*.sh" -not -path "./node_modules/*" | while read -r script; do
    if [ ! -x "$script" ]; then
        echo "⚠️  Script not executable: $script"
        echo "💡 Run: chmod +x $script"
    fi
done

# Check for TODO/FIXME/HACK comments indicating security concerns
echo "🔍 Checking for security-related TODOs..."
if grep -r -i -E "(TODO|FIXME|HACK).*(security|auth|password|secret|token)" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist 2>/dev/null; then
    
    echo "⚠️  Security-related TODOs found - review and address"
fi

# Summary
echo "🔒 Security scan complete!"

if [ "$FOUND_SECRETS" = true ] || [ "$SECURITY_ISSUES" = true ]; then
    echo "⚠️  SECURITY ISSUES DETECTED - Please review and fix!"
    exit 1
else
    echo "✅ No critical security issues detected"
fi

echo "💡 Security best practices:"
echo "  - Regularly rotate API keys and secrets"
echo "  - Use environment variables for all configuration"
echo "  - Keep dependencies updated"
echo "  - Review code for injection vulnerabilities"
echo "  - Enable database row-level security (RLS) in production"