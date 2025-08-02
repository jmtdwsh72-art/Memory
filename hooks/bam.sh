#!/bin/bash
# bam.sh - Auto-fix formatting and basic code issues

set -e

echo "🔨 BAM! Auto-fixing formatting and code issues..."

# Check if we're in a Node.js project
if [ -f "package.json" ]; then
    echo "📦 Found package.json, running Node.js fixes..."
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing dependencies..."
        npm install
    fi
    
    # Run Prettier if it exists
    if npm list prettier &>/dev/null; then
        echo "✨ Running Prettier..."
        npx prettier --write "src/**/*.{ts,js,json}" "*.{ts,js,json}" 2>/dev/null || true
    fi
    
    # Run ESLint with auto-fix if it exists
    if npm list eslint &>/dev/null; then
        echo "🔍 Running ESLint with auto-fix..."
        npx eslint "src/**/*.{ts,js}" --fix 2>/dev/null || true
    fi
    
    # Run TypeScript compiler check
    if [ -f "tsconfig.json" ] && npm list typescript &>/dev/null; then
        echo "🔍 Checking TypeScript..."
        npx tsc --noEmit || {
            echo "⚠️  TypeScript errors found. Please review and fix manually."
        }
    fi
fi

# Fix file permissions
find . -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

# Clean up common issues
echo "🧹 Cleaning up..."

# Remove trailing whitespace
find . -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" | \
    xargs sed -i 's/[[:space:]]*$//' 2>/dev/null || true

# Ensure files end with newline
find . -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" | \
    xargs -I {} sh -c 'if [ -f "{}" ] && [ "$(tail -c1 "{}")" != "" ]; then echo "" >> "{}"; fi' 2>/dev/null || true

echo "✅ BAM! Formatting complete!"

# Show what changed if in git repo
if [ -d ".git" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo "📋 Changes made:"
        git status --short
    else
        echo "📋 No changes needed - code was already clean!"
    fi
fi