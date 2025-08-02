#!/bin/bash
# context_warning.sh - Alert when memory/context overflows

set -e

echo "🧠 Checking memory and context usage..."

# Configuration
MAX_MEMORY_SIZE_MB=50
MAX_LOG_FILES=100
MAX_FILE_SIZE_KB=1000

# Check memory directory size
if [ -d "memory" ]; then
    MEMORY_SIZE=$(du -sm memory 2>/dev/null | cut -f1 || echo "0")
    if [ "$MEMORY_SIZE" -gt "$MAX_MEMORY_SIZE_MB" ]; then
        echo "⚠️  WARNING: Memory directory is ${MEMORY_SIZE}MB (limit: ${MAX_MEMORY_SIZE_MB}MB)"
        echo "💡 Consider running memory cleanup or archiving old logs"
        
        # Show largest files
        echo "📊 Largest memory files:"
        find memory -type f -exec du -k {} \; 2>/dev/null | sort -nr | head -5 | \
            awk '{printf "  %s KB - %s\n", $1, $2}'
    fi
    
    # Check number of log files
    LOG_COUNT=$(find memory/logs -name "*.json" 2>/dev/null | wc -l || echo "0")
    if [ "$LOG_COUNT" -gt "$MAX_LOG_FILES" ]; then
        echo "⚠️  WARNING: Too many log files (${LOG_COUNT} > ${MAX_LOG_FILES})"
        echo "💡 Consider archiving or cleaning old logs"
    fi
fi

# Check for large individual files
echo "🔍 Checking for oversized files..."
find . -name "*.json" -o -name "*.log" -o -name "*.ts" -o -name "*.js" | \
while read -r file; do
    if [ -f "$file" ]; then
        SIZE_KB=$(du -k "$file" | cut -f1)
        if [ "$SIZE_KB" -gt "$MAX_FILE_SIZE_KB" ]; then
            echo "⚠️  Large file detected: $file (${SIZE_KB}KB)"
        fi
    fi
done

# Check database connection and table sizes (if Supabase is configured)
if [ -f ".env" ] && grep -q "SUPABASE_URL" .env; then
    echo "🔗 Supabase configuration detected"
    
    # Check if we can estimate memory usage from logs
    if [ -d "memory/logs" ]; then
        TOTAL_INTERACTIONS=$(find memory/logs -name "*.json" -exec jq '. | length' {} \; 2>/dev/null | \
            awk '{sum += $1} END {print sum+0}')
        
        if [ "$TOTAL_INTERACTIONS" -gt 1000 ]; then
            echo "⚠️  High interaction count: $TOTAL_INTERACTIONS"
            echo "💡 Consider implementing memory summarization"
        fi
    fi
fi

# Check node_modules size (development bloat)
if [ -d "node_modules" ]; then
    NODE_MODULES_SIZE=$(du -sm node_modules 2>/dev/null | cut -f1 || echo "0")
    if [ "$NODE_MODULES_SIZE" -gt 500 ]; then
        echo "⚠️  Large node_modules: ${NODE_MODULES_SIZE}MB"
        echo "💡 Consider cleaning with 'npm prune' or checking for duplicate dependencies"
    fi
fi

# Memory optimization suggestions
echo "💡 Memory optimization tips:"
echo "  - Archive logs older than 30 days"
echo "  - Use memory summarization for long conversations"
echo "  - Implement periodic cleanup in MemoryManager"
echo "  - Consider compression for stored summaries"

echo "✅ Context warning check complete!"

# Exit with warning code if issues found
if [ "$MEMORY_SIZE" -gt "$MAX_MEMORY_SIZE_MB" ] || [ "$LOG_COUNT" -gt "$MAX_LOG_FILES" ]; then
    exit 1
fi