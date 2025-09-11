#!/usr/bin/env bash
set -euo pipefail

# Manual Branch Cleanup Script for ASIAFLEX Repository
# Deletes locally and remotely merged branches with safety exclusions
# 
# Usage: ./scripts/delete-merged-branches.sh [EXCLUDE_REGEX]
# Example: ./scripts/delete-merged-branches.sh "^(main|develop|release/).*"

echo "🗑️ ASIAFLEX Branch Cleanup Tool"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default exclusion regex
DEFAULT_EXCLUDE_REGEX="^(main|develop|dev|staging|production|gh-pages|release/|hotfix/)"
EXCLUDE_REGEX="${1:-$DEFAULT_EXCLUDE_REGEX}"

echo -e "${BLUE}ℹ️ Exclusion pattern: ${NC}$EXCLUDE_REGEX"
echo ""

# Safety confirmation
echo -e "${YELLOW}⚠️ WARNING: This script will delete branches both locally and remotely!${NC}"
echo -e "${YELLOW}⚠️ Only merged branches will be deleted, but please review carefully.${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

# Change to repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo -e "${BLUE}📡 Fetching latest data...${NC}"
git fetch --all --prune

# Ensure we have main branch reference
if ! git show-ref --verify --quiet refs/remotes/origin/main; then
    echo -e "${BLUE}📡 Fetching main branch...${NC}"
    git fetch origin main:refs/remotes/origin/main
fi

echo ""
echo -e "${BLUE}🔍 Finding merged branches...${NC}"

DELETED_LOCAL=0
DELETED_REMOTE=0
SKIPPED_COUNT=0

# Process local branches
echo ""
echo -e "${YELLOW}🏠 Processing local branches...${NC}"
for branch in $(git branch --merged origin/main | sed 's/^[* ] //' | grep -v '^main$'); do
    if [[ "$branch" =~ $EXCLUDE_REGEX ]]; then
        echo -e "${BLUE}🔒${NC} Skipping protected local branch: $branch"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    echo -e "${RED}🗑️${NC} Deleting local branch: $branch"
    if git branch -d "$branch" 2>/dev/null; then
        ((DELETED_LOCAL++))
        echo -e "${GREEN}  ✅ Deleted local branch: $branch${NC}"
    else
        echo -e "${YELLOW}  ⚠️ Could not delete local branch: $branch${NC}"
    fi
done

# Process remote branches
echo ""
echo -e "${YELLOW}🌐 Processing remote branches...${NC}"
for branch in $(git branch -r --merged origin/main | sed 's/^ *origin\///' | grep -v '^HEAD$' | grep -v '^main$'); do
    if [[ "$branch" =~ $EXCLUDE_REGEX ]]; then
        echo -e "${BLUE}🔒${NC} Skipping protected remote branch: $branch"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    # Double-check if branch exists on remote
    if ! git ls-remote --exit-code origin "$branch" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️${NC} Remote branch $branch no longer exists, skipping"
        continue
    fi
    
    echo -e "${RED}🗑️${NC} Deleting remote branch: $branch"
    if git push origin --delete "$branch" 2>/dev/null; then
        ((DELETED_REMOTE++))
        echo -e "${GREEN}  ✅ Deleted remote branch: $branch${NC}"
    else
        echo -e "${YELLOW}  ⚠️ Could not delete remote branch: $branch${NC}"
    fi
done

# Summary
echo ""
echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo -e "${BLUE}📊 Summary:${NC}"
echo "  - Local branches deleted: $DELETED_LOCAL"
echo "  - Remote branches deleted: $DELETED_REMOTE"
echo "  - Protected branches skipped: $SKIPPED_COUNT"

if [ $((DELETED_LOCAL + DELETED_REMOTE)) -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}ℹ️ No merged branches found for deletion.${NC}"
    echo -e "${BLUE}💡 This could mean:${NC}"
    echo "   - All branches are up-to-date"
    echo "   - Branches haven't been merged yet"
    echo "   - All merged branches were already cleaned up"
else
    echo ""
    echo -e "${YELLOW}💡 Tip: Run 'git fetch --prune' to clean up stale remote references${NC}"
fi

echo ""
echo -e "${BLUE}🏁 Done!${NC}"