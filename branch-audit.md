# Branch Audit Report

**Generated on:** 2025-09-11 12:28:21 UTC  
**Repository:** ASIAFLEX  
**Default Branch:** main  

## Summary

- **Total Remote Branches:** 17
- **Analysis Status:** Basic listing (merge analysis requires local setup)
- **Main Branch:** Included in analysis

## Detailed Branch Analysis

| Branch | Status | Notes |
|--------|--------|-------|
| chore/add-security-ci | 🔄 Feature | Development branch (SHA: cf8cf8f) |
| chore/save-local-changes | 🔄 Feature | Development branch (SHA: c54dbf0) |
| chore/update-mint-scripts | 🔄 Feature | Development branch (SHA: 0b79fcf) |
| copilot/fix-1657c26f-20c0-443b-859c-5e70db6ea903 | 🤖 Copilot | AI-generated feature branch (SHA: ff4225d) |
| copilot/fix-2dc181d5-f3ea-408f-acc4-94b132b580af | 🤖 Copilot | AI-generated feature branch (SHA: 2c3b0b0) |
| copilot/fix-3d98ff99-87e5-4bdb-9006-15e9d950c166 | 🤖 Copilot | AI-generated feature branch (SHA: 98a03fe) |
| copilot/fix-5407971e-8135-49df-bb64-1e7abe75fa74 | 🤖 Copilot | AI-generated feature branch (SHA: f611ed1) |
| copilot/fix-8414e6fe-ccc5-441b-b270-e1f587b3f440 | 🤖 Copilot | AI-generated feature branch (SHA: d24650c) |
| copilot/fix-d4b949ba-a03b-4307-972f-9121eee6ecd6 | 🤖 Copilot | AI-generated feature branch (SHA: c8867e3) |
| copilot/fix-dd244470-381c-4fa3-ab46-cce37e570350 | 🤖 Copilot | AI-generated feature branch (SHA: bf6d643) |
| dependabot/github_actions/actions/checkout-5 | 🤖 Dependabot | Automated dependency update (SHA: c77c6ed) |
| dependabot/github_actions/actions/setup-node-5 | 🤖 Dependabot | Automated dependency update (SHA: fcb6c26) |
| fix/utils-eth | 🔄 Feature | Development branch (SHA: 4888e65) |
| main | ✓ Default Branch | Base branch (SHA: e36d804) |
| revert-16-copilot/fix-3d98ff99-87e5-4bdb-9006-15e9d950c166 | ❓ Unknown | Other branch (SHA: 41f95a5) |
| revert-18-copilot/fix-9df619d4-921a-483d-8d97-de0464bcdf6b | ❓ Unknown | Other branch (SHA: e24b096) |
| revert-20-revert-16-copilot/fix-3d98ff99-87e5-4bdb-9006-15e9d950c166 | ❓ Unknown | Other branch (SHA: f55afb4) |

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

