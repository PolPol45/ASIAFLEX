#!/usr/bin/env bash
set -euo pipefail

# Quick Branch Audit Script for ASIAFLEX Repository
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

echo -e "${BLUE}📡 Fetching remote branch information...${NC}"
git fetch --all --prune 2>/dev/null || true

# Get remote branches
echo -e "${BLUE}📊 Getting remote branch list...${NC}"
REMOTE_BRANCHES_RAW=$(git ls-remote --heads origin 2>/dev/null || echo "")

if [ -z "$REMOTE_BRANCHES_RAW" ]; then
    echo -e "${RED}❌ Could not fetch remote branches${NC}"
    exit 1
fi

# Count branches
TOTAL_BRANCHES=$(echo "$REMOTE_BRANCHES_RAW" | wc -l)
echo -e "${BLUE}📊 Found $TOTAL_BRANCHES remote branches${NC}"

# Initialize output file
cat > "$OUTPUT_FILE" << 'EOF'
# Branch Audit Report

**Generated on:** TIMESTAMP_PLACEHOLDER  
**Repository:** ASIAFLEX  
**Default Branch:** main  

## Summary

- **Total Remote Branches:** TOTAL_PLACEHOLDER
- **Analysis Status:** Basic listing (merge analysis requires local setup)
- **Main Branch:** Included in analysis

## Detailed Branch Analysis

| Branch | Status | Notes |
|--------|--------|-------|
EOF

# Replace placeholders
sed -i "s/TIMESTAMP_PLACEHOLDER/$AUDIT_TIMESTAMP/" "$OUTPUT_FILE"
sed -i "s/TOTAL_PLACEHOLDER/$TOTAL_BRANCHES/" "$OUTPUT_FILE"

# Process branches and add to report
echo -e "${YELLOW}🔄 Processing branches...${NC}"
echo "$REMOTE_BRANCHES_RAW" | while IFS=$'\t' read -r sha ref; do
    branch=$(echo "$ref" | sed 's|refs/heads/||')
    short_sha=$(echo "$sha" | cut -c1-7)
    
    if [ "$branch" = "$DEFAULT_BRANCH" ]; then
        echo "| $branch | ✓ Default Branch | Base branch (SHA: $short_sha) |" >> "$OUTPUT_FILE"
    elif [[ "$branch" =~ ^(develop|dev|staging|production|gh-pages)$ ]]; then
        echo "| $branch | 🔒 Protected | Environment/system branch (SHA: $short_sha) |" >> "$OUTPUT_FILE"
    elif [[ "$branch" =~ ^(release|hotfix)/ ]]; then
        echo "| $branch | 🔒 Protected | Release/hotfix branch (SHA: $short_sha) |" >> "$OUTPUT_FILE"
    elif [[ "$branch" =~ ^dependabot/ ]]; then
        echo "| $branch | 🤖 Dependabot | Automated dependency update (SHA: $short_sha) |" >> "$OUTPUT_FILE"
    elif [[ "$branch" =~ ^copilot/ ]]; then
        echo "| $branch | 🤖 Copilot | AI-generated feature branch (SHA: $short_sha) |" >> "$OUTPUT_FILE"
    elif [[ "$branch" =~ ^(chore|feat|fix|docs|style|refactor|test)/ ]]; then
        echo "| $branch | 🔄 Feature | Development branch (SHA: $short_sha) |" >> "$OUTPUT_FILE"
    else
        echo "| $branch | ❓ Unknown | Other branch (SHA: $short_sha) |" >> "$OUTPUT_FILE"
    fi
done

# Add footer sections
cat >> "$OUTPUT_FILE" << 'EOF'

## Branch Categories

### 🔒 Protected Branches
These branches should **never** be automatically deleted:
- `main`, `develop`, `dev`, `staging`, `production`, `gh-pages`
- `release/*`, `hotfix/*`

### 🤖 Automated Branches
These branches are created by bots and may be safe to clean up after review:
- `dependabot/*` - Dependency updates
- `copilot/*` - AI-generated features

### 🔄 Development Branches
These branches follow conventional naming and may be candidates for cleanup if merged:
- `feat/*`, `fix/*`, `chore/*`, `docs/*`, etc.

## Cleanup Recommendations

**⚠️ Important:** This is a basic analysis. For accurate merge detection, use the full audit with local repository setup.

### Next Steps
1. **Review Active PRs:** Check which branches have open pull requests
2. **Manual Merge Check:** For important branches, manually verify merge status
3. **Gradual Cleanup:** Start with obviously old/merged branches
4. **Use Workflows:** Utilize the automated cleanup workflows for safer deletion

---

## Actions Available

- **Run Cleanup (Dry-run):** `Actions → Branch Cleanup → Run workflow → mode=dry-run`
- **Run Cleanup (Delete):** `Actions → Branch Cleanup → Run workflow → mode=delete`
- **Manual Audit:** `./scripts/audit-branches.sh`

**Excluded from Cleanup:** `main`, `develop`, `dev`, `staging`, `production`, `gh-pages`, `release/*`, `hotfix/*`

EOF

echo -e "\n${GREEN}✅ Branch audit completed!${NC}"
echo -e "${BLUE}📄 Report saved to: $OUTPUT_FILE${NC}"
echo -e "${YELLOW}📊 Summary: $TOTAL_BRANCHES total branches found${NC}"

# Display preview
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "\n${BLUE}📋 Generated Report Preview:${NC}"
    echo "----------------------------------------"
    head -25 "$OUTPUT_FILE"
    echo "----------------------------------------"
    echo -e "${BLUE}📄 Full report available in: $OUTPUT_FILE${NC}"
fi