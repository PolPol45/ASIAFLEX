#!/usr/bin/env bash
set -euo pipefail

# Simple Branch Audit Script for ASIAFLEX Repository
# Generates branch analysis with merge status and basic commit info

echo "🔍 Starting branch audit for ASIAFLEX repository..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_BRANCH="main"
OUTPUT_FILE="branch-audit.md"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# Get current timestamp
AUDIT_TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

echo -e "${BLUE}📡 Fetching latest data...${NC}"
git fetch --all --prune

# Ensure we have main branch locally for comparisons
if ! git show-ref --verify --quiet refs/remotes/origin/main; then
    echo -e "${BLUE}📡 Fetching main branch...${NC}"
    git fetch origin main:refs/remotes/origin/main
fi

# Get remote branches using ls-remote
echo -e "${BLUE}📊 Getting remote branch list...${NC}"
git ls-remote --heads origin > /tmp/remote_branches.txt

# Initialize output file
cat > "$OUTPUT_FILE" << EOF
# Branch Audit Report

**Generated on:** $AUDIT_TIMESTAMP  
**Repository:** ASIAFLEX  
**Default Branch:** $DEFAULT_BRANCH  

## Summary

EOF

# Count branches
TOTAL_BRANCHES=$(wc -l < /tmp/remote_branches.txt)
echo -e "${BLUE}📊 Found $TOTAL_BRANCHES remote branches${NC}"

# Initialize counters
MERGED_COUNT=0
NOT_MERGED_COUNT=0

# Create temp files
MERGED_BRANCHES_FILE=$(mktemp)
NOT_MERGED_BRANCHES_FILE=$(mktemp)

# Get main branch SHA for comparison
MAIN_SHA=$(git ls-remote origin main | cut -f1)
echo -e "${BLUE}📋 Main branch SHA: $MAIN_SHA${NC}"

echo -e "${YELLOW}🔄 Analyzing branches...${NC}"

# Process each remote branch
while IFS=$'\t' read -r sha ref; do
    branch=$(echo "$ref" | sed 's|refs/heads/||')
    
    if [ "$branch" = "$DEFAULT_BRANCH" ]; then
        continue
    fi
    
    echo -e "${BLUE}🔄${NC} Checking $branch..."
    
    # Fetch the specific commit if needed
    git fetch origin "$sha" 2>/dev/null || true
    
    # Simple merge check: if the branch SHA is reachable from main
    if git merge-base --is-ancestor "$sha" "origin/main" 2>/dev/null; then
        echo "$branch" >> "$MERGED_BRANCHES_FILE"
        ((MERGED_COUNT++))
        echo -e "${GREEN}✓${NC} $branch (merged)"
    else
        echo "$branch" >> "$NOT_MERGED_BRANCHES_FILE"
        ((NOT_MERGED_COUNT++))
        echo -e "${RED}✗${NC} $branch (not merged)"
    fi
done < /tmp/remote_branches.txt

# Function to get basic branch info using remote data
get_branch_info() {
    local branch="$1"
    local merged_status="$2"
    
    if [ "$branch" = "$DEFAULT_BRANCH" ]; then
        # For main branch
        local commit_sha=$(echo "$MAIN_SHA" | cut -c1-7)
        local ahead_behind="0 / 0"
        echo "| $branch | $merged_status | $ahead_behind | $(date '+%Y-%m-%d'), $commit_sha, System, Default branch |"
    else
        # Get branch SHA from our remote data
        local branch_sha=$(grep "refs/heads/$branch$" /tmp/remote_branches.txt | cut -f1)
        local commit_sha=$(echo "$branch_sha" | cut -c1-7)
        
        # Calculate ahead/behind (simplified)
        local ahead="?"
        local behind="?"
        local ahead_behind="$ahead / $behind"
        
        echo "| $branch | $merged_status | $ahead_behind | unknown, $commit_sha, unknown, Remote branch |"
    fi
}

# Update summary
cat >> "$OUTPUT_FILE" << EOF
- **Total Remote Branches:** $TOTAL_BRANCHES
- **Merged into $DEFAULT_BRANCH:** $MERGED_COUNT
- **Not Merged:** $NOT_MERGED_COUNT
- **Main Branch:** Included in analysis

## Detailed Branch Analysis

| Branch | Merged in $DEFAULT_BRANCH | Ahead / Behind | Last Commit (Date, SHA, Author, Title) |
|--------|---------------------------|----------------|------------------------------------------|
EOF

# Add main branch first
get_branch_info "$DEFAULT_BRANCH" "✓ Base" >> "$OUTPUT_FILE"

# Add merged branches
if [ "$MERGED_COUNT" -gt 0 ]; then
    echo -e "\n${GREEN}📋 Adding merged branches to report...${NC}"
    while IFS= read -r branch; do
        get_branch_info "$branch" "✓ Yes" >> "$OUTPUT_FILE"
    done < "$MERGED_BRANCHES_FILE"
fi

# Add not merged branches
if [ "$NOT_MERGED_COUNT" -gt 0 ]; then
    echo -e "\n${RED}📋 Adding non-merged branches to report...${NC}"
    while IFS= read -r branch; do
        get_branch_info "$branch" "✗ No" >> "$OUTPUT_FILE"
    done < "$NOT_MERGED_BRANCHES_FILE"
fi

# Add cleanup recommendations
cat >> "$OUTPUT_FILE" << EOF

## Cleanup Recommendations

### Branches Safe for Deletion (Merged into $DEFAULT_BRANCH)
EOF

if [ "$MERGED_COUNT" -gt 0 ]; then
    echo "" >> "$OUTPUT_FILE"
    while IFS= read -r branch; do
        echo "- \`$branch\`" >> "$OUTPUT_FILE"
    done < "$MERGED_BRANCHES_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "**Note:** These branches have been fully merged and can be safely deleted using the cleanup workflow." >> "$OUTPUT_FILE"
else
    echo "" >> "$OUTPUT_FILE"
    echo "*No merged branches found that can be deleted.*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

### Branches Requiring Review (Not Merged)
EOF

if [ "$NOT_MERGED_COUNT" -gt 0 ]; then
    echo "" >> "$OUTPUT_FILE"
    while IFS= read -r branch; do
        echo "- \`$branch\` - Review for potential merge or deletion" >> "$OUTPUT_FILE"
    done < "$NOT_MERGED_BRANCHES_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "**Note:** These branches contain commits not in $DEFAULT_BRANCH. Review before deletion." >> "$OUTPUT_FILE"
else
    echo "" >> "$OUTPUT_FILE"
    echo "*All branches are merged into $DEFAULT_BRANCH.*" >> "$OUTPUT_FILE"
fi

# Add footer
cat >> "$OUTPUT_FILE" << EOF

---

## Actions Available

- **Run Cleanup (Dry-run):** \`Actions → Branch Cleanup → Run workflow → mode=dry-run\`
- **Run Cleanup (Delete):** \`Actions → Branch Cleanup → Run workflow → mode=delete\`
- **Manual Audit:** \`./scripts/audit-branches.sh\`
- **Manual Cleanup:** \`./scripts/delete-merged-branches.sh\`

**Excluded from Cleanup:** \`main\`, \`develop\`, \`dev\`, \`staging\`, \`production\`, \`gh-pages\`, \`release/*\`, \`hotfix/*\`

EOF

# Cleanup temporary files
rm -f /tmp/remote_branches.txt "$MERGED_BRANCHES_FILE" "$NOT_MERGED_BRANCHES_FILE"

echo -e "\n${GREEN}✅ Branch audit completed!${NC}"
echo -e "${BLUE}📄 Report saved to: $OUTPUT_FILE${NC}"
echo -e "${YELLOW}📊 Summary: $TOTAL_BRANCHES total, $MERGED_COUNT merged, $NOT_MERGED_COUNT not merged${NC}"

# Display the file if it exists
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "\n${BLUE}📋 Generated Report Preview:${NC}"
    echo "----------------------------------------"
    head -20 "$OUTPUT_FILE"
    echo "----------------------------------------"
    echo -e "${BLUE}📄 Full report available in: $OUTPUT_FILE${NC}"
fi